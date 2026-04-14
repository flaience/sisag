import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";
import type { WhatsAppSendRequestedPayload } from "./types";

type SendWhatsAppResult =
  | {
      ok: true;
      providerMessageId: string | null;
    }
  | {
      ok: false;
      error: string;
    };

async function sendViaMockProvider(
  payload: WhatsAppSendRequestedPayload,
): Promise<SendWhatsAppResult> {
  return {
    ok: true,
    providerMessageId: `mock_${Date.now()}`,
  };
}

export async function dispatchWhatsAppSendRequested(params: {
  outboxId: string;
  payload: WhatsAppSendRequestedPayload;
}) {
  const db = getDb();
  const { outboxId, payload } = params;

  const result = await sendViaMockProvider(payload);

  if (result.ok) {
    await db.insert(messageLogs).values({
      companyId: payload.companyId,
      outboxId,
      channel: "whatsapp",
      provider: "mock",
      toPhone: payload.toPhone,
      messageType: payload.origin,
      body: payload.message,
      status: "sent",
      providerMessageId: result.providerMessageId,
      error: null,
      sentAt: new Date(),
      deliveredAt: null,
      readAt: null,
      failedAt: null,
    });

    return {
      ok: true as const,
      providerMessageId: result.providerMessageId,
    };
  }

  await db.insert(messageLogs).values({
    companyId: payload.companyId,
    outboxId,
    channel: "whatsapp",
    provider: "mock",
    toPhone: payload.toPhone,
    messageType: payload.origin,
    body: payload.message,
    status: "failed",
    providerMessageId: null,
    error: result.error,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: new Date(),
  });

  return {
    ok: false as const,
    error: result.error,
  };
}
