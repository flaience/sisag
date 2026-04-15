import { dispatchWhatsAppSendRequested } from "@/modules/whatsapp/whatsapp-dispatch.service";
import type { WhatsAppSendRequestedPayload } from "@/modules/whatsapp/types";

export async function handleWhatsAppSendRequested(params: {
  outboxId: string;
  payload: unknown;
}) {
  const payload = params.payload as WhatsAppSendRequestedPayload;

  return await dispatchWhatsAppSendRequested({
    outboxId: params.outboxId,
    payload,
  });
}
