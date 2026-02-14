// src/lib/request-context.ts
import { getDb } from "@/lib/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export type RequestContext = {
  companyId: string;
  userId: string | null;
  role?: string | null;
};

export type WebhookAuthOptions = {
  secretHeaderName?: string; // default: x-sisag-secret
  expectedSecretEnv?: string; // default: OUTBOX_WEBHOOK_SECRET
  companyHeaderName?: string; // default: x-company-id
};

function getHeader(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase());
}

/**
 * Contexto para webhooks (n8n / mock / meta):
 * - valida secret
 * - resolve companyId do body.companyId OU header x-company-id
 */
export function requireWebhookContext(
  req: Request,
  body: any,
  opts: WebhookAuthOptions = {},
): RequestContext {
  const secretHeaderName = opts.secretHeaderName ?? "x-sisag-secret";
  const expectedSecretEnv = opts.expectedSecretEnv ?? "OUTBOX_WEBHOOK_SECRET";
  const companyHeaderName = opts.companyHeaderName ?? "x-company-id";

  const expected = process.env[expectedSecretEnv] ?? "";
  if (!expected) throw new Error("server_misconfigured:missing_webhook_secret");

  const provided = getHeader(req, secretHeaderName) ?? "";
  if (!provided || provided !== expected)
    throw new Error("unauthorized:webhook_secret");

  const companyId =
    (body?.companyId ?? "").toString() ||
    (getHeader(req, companyHeaderName) ?? "").toString();

  if (!companyId) throw new Error("missing_company_id");

  return { companyId, userId: null };
}

/**
 * Contexto para rotas autenticadas:
 * resolve companyId via profiles usando userId (Supabase Auth).
 */
export async function requireAuthContext(params: {
  userId: string;
}): Promise<RequestContext> {
  const db = getDb();

  const rows = await db
    .select({
      companyId: profiles.companyId,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.id, params.userId))
    .limit(1);

  const p = rows[0];
  const companyId = p?.companyId ?? null;

  if (!companyId) throw new Error("missing_company_for_user");

  return { companyId, userId: params.userId, role: p?.role ?? null };
}
