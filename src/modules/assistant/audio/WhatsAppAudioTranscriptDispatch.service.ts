import crypto from "node:crypto";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { messageLogs, whatsappAudioProcessing } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { AssistantWhatsAppService } from "@/modules/assistant/AssistantWhatsApp.service";
import { createN8nAgentChannelIngressMessage, type N8nAgentChannelIngressMessage } from "@/modules/agents/n8n/N8nAgentChannelIngress";

type Claimed = { id: string; companyId: string; providerMessageId: string; transcript: string; leaseToken: string };
export type WhatsAppAudioTranscriptDispatchDependencies = {
  listCandidates: (input: { now: Date; batchSize: number }) => Promise<Array<{ id: string; companyId: string }>>;
  claim: (input: { id: string; companyId: string; now: Date }) => Promise<Claimed | null>;
  findIdentity: (input: { companyId: string; providerMessageId: string }) => Promise<{ phone: string; whatsappAccountId: string } | null>;
  dispatch: (input: N8nAgentChannelIngressMessage) => Promise<{ ok: boolean }>;
  complete: (input: { id: string; companyId: string; leaseToken: string; now: Date }) => Promise<boolean>;
  fail: (input: { id: string; companyId: string; leaseToken: string; errorCode: string; now: Date }) => Promise<boolean>;
};

const maximumAttempts = 3;
const boundedBatchSize = (value: number) => Number.isSafeInteger(value) ? Math.min(20, Math.max(1, value)) : 10;
const safeError = (value: string) => /^[a-z0-9_]{1,64}$/.test(value) ? value : "dispatch_failed";

export const defaultWhatsAppAudioTranscriptDispatchDependencies: WhatsAppAudioTranscriptDispatchDependencies = {
  listCandidates: async ({ now, batchSize }) => getDb().select({ id: whatsappAudioProcessing.id, companyId: whatsappAudioProcessing.companyId })
    .from(whatsappAudioProcessing).where(and(
      eq(whatsappAudioProcessing.status, "completed"),
      isNull(whatsappAudioProcessing.dispatchedAt),
      lt(whatsappAudioProcessing.dispatchAttempts, maximumAttempts),
      or(isNull(whatsappAudioProcessing.dispatchLeaseExpiresAt), lt(whatsappAudioProcessing.dispatchLeaseExpiresAt, now)),
    )).orderBy(asc(whatsappAudioProcessing.createdAt)).limit(batchSize),
  claim: async ({ id, companyId, now }) => {
    const leaseToken = crypto.randomUUID();
    const rows = await getDb().update(whatsappAudioProcessing).set({
      dispatchAttempts: sql`${whatsappAudioProcessing.dispatchAttempts} + 1`,
      dispatchLeaseToken: leaseToken,
      dispatchLeaseExpiresAt: new Date(now.getTime() + 60_000),
      dispatchErrorCode: null,
      updatedAt: now,
    }).where(and(
      eq(whatsappAudioProcessing.id, id),
      eq(whatsappAudioProcessing.companyId, companyId),
      eq(whatsappAudioProcessing.status, "completed"),
      isNull(whatsappAudioProcessing.dispatchedAt),
      lt(whatsappAudioProcessing.dispatchAttempts, maximumAttempts),
      or(isNull(whatsappAudioProcessing.dispatchLeaseExpiresAt), lt(whatsappAudioProcessing.dispatchLeaseExpiresAt, now)),
    )).returning({ id: whatsappAudioProcessing.id, companyId: whatsappAudioProcessing.companyId, providerMessageId: whatsappAudioProcessing.providerMessageId, transcript: whatsappAudioProcessing.transcript });
    const row = rows[0];
    return row?.transcript ? { ...row, transcript: row.transcript, leaseToken } : null;
  },
  findIdentity: async ({ companyId, providerMessageId }) => {
    const rows = await getDb().select({ phone: messageLogs.toPhone, whatsappAccountId: messageLogs.whatsappAccountId }).from(messageLogs).where(and(
      eq(messageLogs.companyId, companyId),
      eq(messageLogs.providerMessageId, providerMessageId),
      eq(messageLogs.channel, "whatsapp"),
      eq(messageLogs.provider, "meta"),
      eq(messageLogs.messageType, "audio"),
    )).limit(1);
    const row = rows[0];
    return row?.phone && row.whatsappAccountId ? { phone: row.phone, whatsappAccountId: row.whatsappAccountId } : null;
  },
  dispatch: (input) => AssistantWhatsAppService.handleInbound({
    companyId: input.mirrorInput.companyId,
    phone: input.mirrorInput.senderPhoneE164,
    text: input.mirrorInput.text,
    correlationId: input.mirrorInput.providerMessageId,
  }),
  complete: async ({ id, companyId, leaseToken, now }) => {
    const rows = await getDb().update(whatsappAudioProcessing).set({ dispatchedAt: now, dispatchLeaseToken: null, dispatchLeaseExpiresAt: null, dispatchErrorCode: null, updatedAt: now }).where(and(
      eq(whatsappAudioProcessing.id, id), eq(whatsappAudioProcessing.companyId, companyId), eq(whatsappAudioProcessing.status, "completed"), isNull(whatsappAudioProcessing.dispatchedAt), eq(whatsappAudioProcessing.dispatchLeaseToken, leaseToken),
    )).returning({ id: whatsappAudioProcessing.id });
    return rows.length === 1;
  },
  fail: async ({ id, companyId, leaseToken, errorCode, now }) => {
    const rows = await getDb().update(whatsappAudioProcessing).set({ dispatchLeaseToken: null, dispatchLeaseExpiresAt: null, dispatchErrorCode: safeError(errorCode), updatedAt: now }).where(and(
      eq(whatsappAudioProcessing.id, id), eq(whatsappAudioProcessing.companyId, companyId), eq(whatsappAudioProcessing.status, "completed"), isNull(whatsappAudioProcessing.dispatchedAt), eq(whatsappAudioProcessing.dispatchLeaseToken, leaseToken),
    )).returning({ id: whatsappAudioProcessing.id });
    return rows.length === 1;
  },
};

export class WhatsAppAudioTranscriptDispatchService {
  static async run(input: { batchSize: number; now?: Date }, dependencies: WhatsAppAudioTranscriptDispatchDependencies = defaultWhatsAppAudioTranscriptDispatchDependencies) {
    const now = input.now ?? new Date();
    const candidates = await dependencies.listCandidates({ now, batchSize: boundedBatchSize(input.batchSize) });
    const summary = { ok: true as const, scanned: candidates.length, dispatched: 0, retryPending: 0 };
    for (const candidate of candidates) {
      const claimed = await dependencies.claim({ ...candidate, now }).catch(() => null);
      if (!claimed) continue;
      const identity = await dependencies.findIdentity({ companyId: claimed.companyId, providerMessageId: claimed.providerMessageId }).catch(() => null);
      if (!identity) {
        await dependencies.fail({ id: claimed.id, companyId: claimed.companyId, leaseToken: claimed.leaseToken, errorCode: "inbound_identity_missing", now }).catch(() => false);
        summary.retryPending += 1;
        continue;
      }
      const ingress = createN8nAgentChannelIngressMessage({
        source: "whatsapp_audio",
        companyId: claimed.companyId,
        whatsappAccountId: identity.whatsappAccountId,
        senderPhoneE164: identity.phone,
        providerMessageId: claimed.providerMessageId,
        text: claimed.transcript,
        receivedAt: now,
      });
      const result = await dependencies.dispatch(ingress).catch(() => ({ ok: false }));
      if (!result.ok) {
        await dependencies.fail({ id: claimed.id, companyId: claimed.companyId, leaseToken: claimed.leaseToken, errorCode: "assistant_dispatch_failed", now }).catch(() => false);
        summary.retryPending += 1;
        continue;
      }
      const completed = await dependencies.complete({ id: claimed.id, companyId: claimed.companyId, leaseToken: claimed.leaseToken, now }).catch(() => false);
      if (completed) summary.dispatched += 1;
      else summary.retryPending += 1;
    }
    return summary;
  }
}
