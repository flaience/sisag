import { getDb } from "@/lib/db";
import { clients } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export class ClientRepository {
  static async findByPhoneE164(companyId: string, phoneE164: string) {
    const db = getDb();
    const row = await db
      .select()
      .from(clients)
      .where(
        and(eq(clients.companyId, companyId), eq(clients.phoneE164, phoneE164)),
      )
      .limit(1);

    return row[0] ?? null;
  }

  static async createFromWhatsApp(data: {
    companyId: string;
    name: string;
    phoneE164: string;
  }) {
    const db = getDb();

    const inserted = await db
      .insert(clients)
      .values({
        companyId: data.companyId, // ✅ obrigatório
        name: data.name,
        phoneE164: data.phoneE164, // ✅ obrigatório (se você colocou .notNull())
      })
      .returning();

    return inserted[0];
  }
}
