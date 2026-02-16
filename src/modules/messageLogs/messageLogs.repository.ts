// src/modules/messageLogs/messageLogs.repository.ts
import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function messageLogExistsForOutbox(outboxId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: messageLogs.id })
    .from(messageLogs)
    .where(eq(messageLogs.outboxId, outboxId))
    .limit(1);

  return !!rows[0];
}

export async function messageLogCreate(params: {
  companyId: string;
  whatsappAccountId?: string | null;
  outboxId?: string | null;
  channel: string; // whatsapp
  provider: string; // meta | mock
  toPhone: string;
  messageType?: string; // text
  body: string;
  status: string; // queued|sent|failed...
  requestPayload?: any;
  responsePayload?: any;
  providerMessageId?: string | null;
  error?: string | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(messageLogs)
    .values({
      companyId: params.companyId,
      whatsappAccountId: params.whatsappAccountId ?? null,
      outboxId: params.outboxId ?? null,
      channel: params.channel,
      provider: params.provider,
      toPhone: params.toPhone,
      messageType: params.messageType ?? "text",
      body: params.body,
      status: params.status,
      requestPayload: params.requestPayload ?? null,
      responsePayload: params.responsePayload ?? null,
      providerMessageId: params.providerMessageId ?? null,
      error: params.error ?? null,
      sentAt: params.sentAt ?? null,
      failedAt: params.failedAt ?? null,
    })
    .returning();

  return row;
}
