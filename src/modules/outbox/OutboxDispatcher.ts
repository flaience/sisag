// src/modules/outbox/OutboxDispatcher.ts
import {
  outboxClaimBatch,
  outboxMarkDone,
  outboxMarkFailed,
  type OutboxRow,
} from "@/modules/outbox/outbox.repository";
import { handleWhatsAppSendText } from "@/modules/outbox/handlers/whatsappSendText.handler";
import { handleBookingCreated } from "@/modules/outbox/handlers/bookingCreated.handler";

function backoffNextRetry(attempts: number) {
  // simples e bom: 10s, 30s, 60s, 120s... até 15min
  const seconds = Math.min(
    10 * Math.pow(2, Math.max(0, attempts - 1)),
    15 * 60,
  );
  return new Date(Date.now() + seconds * 1000);
}

async function dispatchOne(ev: OutboxRow) {
  // Router de handlers por eventType
  switch (ev.eventType) {
    case "booking.created":
      return handleBookingCreated({ outboxId: ev.id, payload: ev.payload });

    case "whatsapp.send_text":
      return handleWhatsAppSendText({ outboxId: ev.id, payload: ev.payload });

    default:
      throw new Error(`Unhandled eventType: ${ev.eventType}`);
  }
}

export const OutboxDispatcher = {
  async dispatchOnce(params?: { limit?: number; workerId?: string }) {
    const workerId =
      params?.workerId ??
      `next-api-${process.pid}-${Math.random().toString(16).slice(2)}`;
    const limit = params?.limit ?? 10;

    const claimed = await outboxClaimBatch({ workerId, limit });
    if (!claimed.length)
      return { ok: true as const, claimed: 0, done: 0, failed: 0 };

    let done = 0;
    let failed = 0;

    for (const ev of claimed) {
      try {
        await dispatchOne(ev);
        await outboxMarkDone({ id: ev.id, workerId });
        done++;
      } catch (err: any) {
        const message = err?.message ?? "error";
        const attempts = (ev.attempts ?? 0) + 1;
        const nextRetryAt = backoffNextRetry(attempts);

        await outboxMarkFailed({
          id: ev.id,
          workerId,
          errorMessage: message,
          nextRetryAt,
        });
        failed++;
      }
    }

    return { ok: true as const, claimed: claimed.length, done, failed };
  },
};
