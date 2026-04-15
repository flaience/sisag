import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";
import { getWhatsAppProvider } from "./provider";
import type { WhatsAppSendRequestedPayload } from "./types";

export async function dispatchWhatsAppSendRequested(params: {
  outboxId: string;
  payload: WhatsAppSendRequestedPayload;
}) {
  const db = getDb();
  const { outboxId, payload } = params;

  const provider = getWhatsAppProvider();
  const providerName = process.env.WHATSAPP_PROVIDER?.toLowerCase() ?? "mock";

  const result = await provider.sendMessage({
    to: payload.toPhone,
    message: payload.message,
  });

  if (result.ok) {
    await db.insert(messageLogs).values({
      companyId: payload.companyId,
      outboxId,
      channel: "whatsapp",
      provider: providerName,
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
    provider: providerName,
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
