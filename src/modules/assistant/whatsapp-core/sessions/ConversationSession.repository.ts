//src/modules/assistant/whatsapp-core/sessions/ConversationSession.repository.ts
import { getDb } from "@/lib/db";
import { conversationSessions } from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

export class ConversationSessionRepository {
  static async findOpen(companyId: string, clientId: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(conversationSessions)
      .where(
        and(
          eq(conversationSessions.companyId, companyId),
          eq(conversationSessions.clientId, clientId),
          eq(conversationSessions.status, "open"),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  static async openOrUpdate(companyId: string, clientId: string, context: any) {
    const db = getDb();

    const existing = await this.findOpen(companyId, clientId);
    if (existing) {
      const updated = await db
        .update(conversationSessions)
        .set({
          context,
          updatedAt: new Date(),
        })
        .where(eq(conversationSessions.id, existing.id))
        .returning();

      return updated[0];
    }

    const inserted = await db
      .insert(conversationSessions)
      .values({
        companyId,
        clientId,
        status: "open",
        context,
      })
      .returning();

    return inserted[0];
  }

  static async close(sessionId: string) {
    const db = getDb();
    const updated = await db
      .update(conversationSessions)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(conversationSessions.id, sessionId))
      .returning();

    return updated[0];
  }
}
