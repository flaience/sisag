import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import type { WhatsAppSendRequestedPayload } from "./types";

export async function publishWhatsAppSendRequested(
  payload: WhatsAppSendRequestedPayload,
) {
  const db = getDb();

  await db.insert(outbox).values({
    aggregateType: "booking",
    aggregateId: payload.bookingId,
    eventType: "whatsapp.send.requested",
    payload,
    status: "pending",
  });
}
