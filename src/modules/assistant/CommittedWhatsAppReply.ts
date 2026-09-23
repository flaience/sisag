import { eq } from "drizzle-orm";
import { outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

// Call only inside the conversation transaction, before any domain mutation.
// This receipt lives as long as the corresponding outbox row is retained.
export async function hasCommittedWhatsAppReply(input: {
  companyId: string;
  phone: string;
  correlationId?: string | null;
}): Promise<boolean> {
  if (!input.correlationId) return false;
  const rows = await getDb().select({ eventType: outbox.eventType, payload: outbox.payload })
    .from(outbox).where(eq(outbox.dedupeKey, `wa_send:${input.correlationId}`)).limit(1);
  if (!rows.length) return false;
  const row = rows[0];
  const payload: unknown = row.payload;
  if (row.eventType !== "whatsapp.send.requested" || !payload || typeof payload !== "object"
    || !("companyId" in payload) || payload.companyId !== input.companyId
    || !("toPhone" in payload) || payload.toPhone !== input.phone
    || !("correlationId" in payload) || payload.correlationId !== input.correlationId) {
    throw new Error("inbound_receipt_identity_conflict");
  }
  // A queued reply proves processing committed, not that WhatsApp delivered it.
  return true;
}
