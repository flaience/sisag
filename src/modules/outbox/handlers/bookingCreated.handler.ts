import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  messageLogs,
  whatsappAccounts,
  conversationSessions,
} from "@/drizzle/schema";
import { WhatsAppSender } from "@/modules/whatsapp/WhatsAppSender";

export async function handleBookingCreated(event: {
  outboxId: string;
  payload: any;
}) {
  const db = getDb();

  const companyId = String(event.payload.companyId);
  const clientId = String(event.payload.clientId);

  const c = await db
    .select({ phoneE164: clients.phoneE164, name: clients.name })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  const toPhone = c[0]?.phoneE164;
  if (!toPhone) throw new Error("client_phone_not_found");

  const wa = await db
    .select({ id: whatsappAccounts.id, provider: whatsappAccounts.provider })
    .from(whatsappAccounts)
    .where(eq(whatsappAccounts.companyId, companyId))
    .limit(1);

  const whatsappAccountId = wa[0]?.id ?? null;
  const provider = wa[0]?.provider ?? "mock";

  const body =
    `Olá${c[0]?.name ? `, ${c[0].name}` : ""}! ✅ Seu agendamento foi criado.\n` +
    `Início: ${event.payload.startTime}\n` +
    `Status: ${event.payload.status}`;

  // ✅ garante 1 sessão aberta por (company, client) — não precisa retornar nada
  await db
    .insert(conversationSessions)
    .values({
      companyId,
      clientId,
      status: "open",
      context: {
        lastBookingId: event.payload.bookingId,
        lastBookingStartTime: event.payload.startTime,
      },
    })
    .onConflictDoNothing();

  // 1) cria log "sending" e pega id
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

  // 2) envia (mock)
  const send = await WhatsAppSender.sendText({ companyId, toPhone, body });

  if (send.ok === false) {
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
