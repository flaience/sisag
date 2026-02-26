import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { messageLogs, whatsappAccounts } from "@/drizzle/schema";
import { WhatsAppSender } from "@/modules/whatsapp/WhatsAppSender";

export async function handleWhatsAppSendText(event: {
  outboxId: string;
  payload: any;
}) {
  const db = getDb();

  const companyId = String(event.payload.companyId);
  const toPhone = String(event.payload.toPhone);
  const body = String(event.payload.body ?? "");

  // conta WhatsApp (1ª por enquanto)
  const wa = await db
    .select({ id: whatsappAccounts.id, provider: whatsappAccounts.provider })
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.companyId, companyId))
    .limit(1);

  const whatsappAccountId = wa[0]?.id ?? null;
  const provider = wa[0]?.provider ?? "mock";

  // 1) cria log como sending
  const inserted = await db
    .insert(messageLogs)
    .values({
      companyId,
      whatsappAccountId,
      outboxId: event.outboxId,
      channel: "whatsapp",
      provider,
      toPhone,
      messageType: "text",
      body,
      status: "sending",
      requestPayload: event.payload,
    })
    .returning({ id: messageLogs.id });

  const messageLogId = inserted[0]?.id;
  if (!messageLogId) throw new Error("message_log_insert_failed");

  // 2) envia via sender (mock ok)
  const send = await WhatsAppSender.sendText({ companyId, toPhone, body });

  if (!send.ok) {
    await db
      .update(messageLogs)
      .set({
        status: "failed",
        error: send.error,
        responsePayload: send.response ?? null,
        failedAt: new Date(),
      })
      .where(eq(messageLogs.id, messageLogId));

    throw new Error(`whatsapp_send_failed:${send.error}`);
  }

  // 3) sucesso
  await db
    .update(messageLogs)
    .set({
      status: "sent",
      providerMessageId: send.providerMessageId,
      responsePayload: send.response ?? null,
      sentAt: new Date(),
    })
    .where(eq(messageLogs.id, messageLogId));

  return {
    ok: true as const,
    messageLogId,
    providerMessageId: send.providerMessageId,
  };
}
