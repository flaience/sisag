import { dispatchWhatsAppSendRequested } from "@/modules/whatsapp/whatsapp-dispatch.service";
import type { WhatsAppSendRequestedPayload } from "@/modules/whatsapp/types";

export async function handleOutboxEvent(params: {
  outboxId: string;
  eventType: string;
  payload: unknown;
}) {
  const { outboxId, eventType, payload } = params;

  switch (eventType) {
    case "whatsapp.send.requested":
      return await dispatchWhatsAppSendRequested({
        outboxId,
        payload: payload as WhatsAppSendRequestedPayload,
      });

    default:
      throw new Error(`Unsupported outbox event: ${eventType}`);
  }
}
