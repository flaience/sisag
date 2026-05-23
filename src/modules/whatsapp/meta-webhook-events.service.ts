import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  messageLogs,
  whatsappMessageStatusEvents,
  whatsappWebhookEvents,
} from "@/drizzle/schema";

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

export async function saveMetaStatusEvent(params: {
  companyId: string;
  providerMessageId: string;
  status: string;
  timestampMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawPayload: unknown;
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
      provider: "meta",
      providerMessageId: params.providerMessageId,
      messageLogId: messageLogRows[0]?.id ?? null,
      status: params.status,
      timestampMs: params.timestampMs ?? null,
      errorCode: params.errorCode ?? null,
      errorMessage: params.errorMessage ?? null,
      rawPayload: params.rawPayload as any,
    })
    .onConflictDoNothing();
}
