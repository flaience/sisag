import { randomUUID } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { whatsappAudioProcessing } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const WHATSAPP_AUDIO_PROCESSING_POLICY = {
  version: "whatsapp_audio_processing_v1",
  maximumAttempts: 3,
  leaseMilliseconds: 60_000,
  maximumTranscriptCharacters: 20_000,
} as const;

const safeErrorCode = (value: string) => /^[a-z0-9_]{1,64}$/.test(value) ? value : "processing_failed";

export class WhatsAppAudioProcessingService {
  static async enqueue(input: { companyId: string; whatsappAccountId?: string | null; providerMessageId: string; mediaId: string; mimeType?: string | null }) {
    const db = getDb();
    const inserted = await db.insert(whatsappAudioProcessing).values({
      companyId: input.companyId,
      whatsappAccountId: input.whatsappAccountId ?? null,
      providerMessageId: input.providerMessageId,
      mediaId: input.mediaId,
      mimeType: input.mimeType ?? null,
      status: "pending",
    }).onConflictDoNothing({
      target: [whatsappAudioProcessing.companyId, whatsappAudioProcessing.providerMessageId],
    }).returning({ id: whatsappAudioProcessing.id, status: whatsappAudioProcessing.status });
    if (inserted[0]) return { ok: true as const, created: true as const, ...inserted[0] };
    const existing = await db.select({ id: whatsappAudioProcessing.id, status: whatsappAudioProcessing.status })
      .from(whatsappAudioProcessing)
      .where(and(eq(whatsappAudioProcessing.companyId, input.companyId), eq(whatsappAudioProcessing.providerMessageId, input.providerMessageId)))
      .limit(1);
    return existing[0] ? { ok: true as const, created: false as const, ...existing[0] } : { ok: false as const, error: "enqueue_conflict" as const };
  }

  static async claim(input: { companyId: string; id: string; now?: Date }) {
    const now = input.now ?? new Date();
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + WHATSAPP_AUDIO_PROCESSING_POLICY.leaseMilliseconds);
    const rows = await getDb().update(whatsappAudioProcessing).set({
      status: "processing",
      attempts: sql`${whatsappAudioProcessing.attempts} + 1`,
      leaseToken,
      leaseExpiresAt,
      errorCode: null,
      updatedAt: now,
    }).where(and(
      eq(whatsappAudioProcessing.companyId, input.companyId),
      eq(whatsappAudioProcessing.id, input.id),
      lt(whatsappAudioProcessing.attempts, WHATSAPP_AUDIO_PROCESSING_POLICY.maximumAttempts),
      or(eq(whatsappAudioProcessing.status, "pending"), and(eq(whatsappAudioProcessing.status, "processing"), lt(whatsappAudioProcessing.leaseExpiresAt, now))),
    )).returning({ id: whatsappAudioProcessing.id, mediaId: whatsappAudioProcessing.mediaId, mimeType: whatsappAudioProcessing.mimeType, attempts: whatsappAudioProcessing.attempts, leaseToken: whatsappAudioProcessing.leaseToken });
    return rows[0] ? { ok: true as const, ...rows[0] } : { ok: false as const, error: "not_claimable" as const };
  }

  static async complete(input: { companyId: string; id: string; leaseToken: string; transcript: string; confidence?: number | null; policyVersion: string }) {
    const transcript = input.transcript.trim();
    if (!transcript || transcript.length > WHATSAPP_AUDIO_PROCESSING_POLICY.maximumTranscriptCharacters) return { ok: false as const, error: "invalid_transcript" as const };
    const confidence = input.confidence == null ? null : Math.round(Math.max(0, Math.min(1, input.confidence)) * 1000);
    const now = new Date();
    const rows = await getDb().update(whatsappAudioProcessing).set({ status: "completed", transcript, confidence, policyVersion: input.policyVersion, completedAt: now, leaseToken: null, leaseExpiresAt: null, errorCode: null, updatedAt: now })
      .where(and(eq(whatsappAudioProcessing.companyId, input.companyId), eq(whatsappAudioProcessing.id, input.id), eq(whatsappAudioProcessing.status, "processing"), eq(whatsappAudioProcessing.leaseToken, input.leaseToken)))
      .returning({ id: whatsappAudioProcessing.id });
    return rows[0] ? { ok: true as const, id: rows[0].id } : { ok: false as const, error: "lease_lost" as const };
  }

  static async fail(input: { companyId: string; id: string; leaseToken: string; errorCode: string; retryable: boolean }) {
    const db = getDb();
    const current = await db.select({ attempts: whatsappAudioProcessing.attempts }).from(whatsappAudioProcessing)
      .where(and(eq(whatsappAudioProcessing.companyId, input.companyId), eq(whatsappAudioProcessing.id, input.id), eq(whatsappAudioProcessing.status, "processing"), eq(whatsappAudioProcessing.leaseToken, input.leaseToken))).limit(1);
    if (!current[0]) return { ok: false as const, error: "lease_lost" as const };
    const terminal = !input.retryable || current[0].attempts >= WHATSAPP_AUDIO_PROCESSING_POLICY.maximumAttempts;
    const now = new Date();
    const rows = await db.update(whatsappAudioProcessing).set({ status: terminal ? "failed" : "pending", errorCode: safeErrorCode(input.errorCode), failedAt: terminal ? now : null, leaseToken: null, leaseExpiresAt: null, updatedAt: now })
      .where(and(eq(whatsappAudioProcessing.companyId, input.companyId), eq(whatsappAudioProcessing.id, input.id), eq(whatsappAudioProcessing.status, "processing"), eq(whatsappAudioProcessing.leaseToken, input.leaseToken)))
      .returning({ id: whatsappAudioProcessing.id, status: whatsappAudioProcessing.status });
    return rows[0] ? { ok: true as const, ...rows[0] } : { ok: false as const, error: "lease_lost" as const };
  }
}
