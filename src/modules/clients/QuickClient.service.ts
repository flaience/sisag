import { and, eq, or, sql } from "drizzle-orm";
import { clients } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { QuickClientInput } from "./QuickClient.schema";

type Client = { id: string; name: string; phoneE164: string; email: string | null };
type Dependencies = { find?: (companyId: string, phone: string, email: string | null) => Promise<Client | null>; create?: (companyId: string, input: QuickClientInput) => Promise<Client> };

async function find(companyId: string, phone: string, email: string | null) {
  const identity = email ? or(eq(clients.phoneE164, phone), sql`lower(${clients.email}) = lower(${email})`) : eq(clients.phoneE164, phone);
  const rows = await getDb().select({ id: clients.id, name: clients.name, phoneE164: clients.phoneE164, email: clients.email }).from(clients).where(and(eq(clients.companyId, companyId), identity)).limit(1);
  return rows[0] ?? null;
}
async function create(companyId: string, input: QuickClientInput) {
  const rows = await getDb().insert(clients).values({ companyId, name: input.name, phoneE164: input.whatsapp, email: input.email }).returning({ id: clients.id, name: clients.name, phoneE164: clients.phoneE164, email: clients.email });
  return rows[0];
}

export async function resolveQuickClient(companyId: string, input: QuickClientInput, dependencies: Dependencies = {}) {
  if (!companyId) throw new Error("missing_company");
  const existing = await (dependencies.find ?? find)(companyId, input.whatsapp, input.email);
  if (existing) return { item: existing, created: false };
  try { return { item: await (dependencies.create ?? create)(companyId, input), created: true }; }
  catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      const raced = await (dependencies.find ?? find)(companyId, input.whatsapp, input.email);
      if (raced) return { item: raced, created: false };
    }
    throw error;
  }
}
