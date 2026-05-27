import { getDb } from "@/lib/db";
import {
  messageLogs,
  whatsappMessageStatusEvents,
  whatsappWebhookEvents,
  whatsappAccounts,
} from "@/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

export async function saveMetaWebhookEvent(params: {
  companyId: string | null;
  eventType: string;
  providerMessageId?: string | null;
  payload: unknown;
  headers?: Record<string, string> | null;
}) {
  const db = getDb();

  await db.insert(whatsappWebhookEvents).values({
    companyId: params.companyId,
    provider: "meta",
    eventType: params.eventType,
    providerMessageId: params.providerMessageId ?? null,
    payload: params.payload as any,
    headers: params.headers as any,
  });
}
export async function saveMetaInboundMessage(params: {
  companyId: string;
  whatsappAccountId?: string | null;
  providerMessageId: string;
  fromPhone: string;
  body: string;
  rawPayload: unknown;
}) {
  const db = getDb();

  const existing = await db
    .select({ id: messageLogs.id })
    .from(messageLogs)
    .where(eq(messageLogs.providerMessageId, params.providerMessageId))
    .limit(1);

  if (existing[0]) {
    return { ok: true as const, skipped: true as const };
  }

  await db.insert(messageLogs).values({
    companyId: params.companyId,
    whatsappAccountId: params.whatsappAccountId ?? null,
    channel: "whatsapp",
    provider: "meta",
    toPhone: params.fromPhone,
    messageType: "text",
    body: params.body,
    status: "received",
    providerMessageId: params.providerMessageId,
    requestPayload: params.rawPayload as any,
    responsePayload: null,
  });

  return { ok: true as const, skipped: false as const };
}
export async function saveMetaStatusEvent(params: {
  companyId: string;
  whatsappAccountId?: string | null;
  providerMessageId: string;
  status: string;
  timestampMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawPayload?: unknown;
}) {
  const db = getDb();

  const messageLogRows = await db
    .select({ id: messageLogs.id })
    .from(messageLogs)
    .where(eq(messageLogs.providerMessageId, params.providerMessageId))
    .limit(1);

  await db
    .insert(whatsappMessageStatusEvents)
    .values({
      companyId: params.companyId,
      whatsappAccountId: params.whatsappAccountId ?? null,
      provider: "meta",
      providerMessageId: params.providerMessageId,
      status: params.status,
      timestampMs: params.timestampMs ?? null,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      rawPayload: params.rawPayload ?? null,
    })
    .onConflictDoNothing();
}
export async function findMetaAccountByPhoneNumberId(phoneNumberId: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: whatsappAccounts.id,
      companyId: whatsappAccounts.companyId,
    })
    .from(whatsappAccounts)
    .where(
      and(
        eq(whatsappAccounts.provider, "meta"),
        sql`${whatsappAccounts.providerConfig}->>'phone_number_id' = ${phoneNumberId}`,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
