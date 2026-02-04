import { getDb } from "@/lib/db";
import { clients } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export class ClientRepository {
  static async findByPhone(phoneE164: string) {
    const db = getDb();
    const row = await db
      .select()
      .from(clients)
      .where(eq(clients.phoneE164, phoneE164))
      .limit(1);
    return row[0] ?? null;
  }

  static async createMinimal(data: { name: string; phone: string }) {
    const db = getDb();
    const inserted = await db
      .insert(clients)
      .values({
        name: data.name,
        phoneE164: data.phone,
      })
      .returning();

    return inserted[0];
  }
}
