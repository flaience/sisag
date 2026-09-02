import { and, eq, isNull, sql } from "drizzle-orm";
import { bookingEvents, bookingRecoveryCases, bookingRecoveryResponses } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
export function boundedRecoverySlaHours(value: number | undefined) { return Math.min(Math.max(value ?? 4, 1), 72); }
export class BookingRecoverySlaEscalationService {
  static async run(input: { slaHours?: number; batchSize?: number; now?: Date }) {
    const db = getDb(); const now = input.now ?? new Date(); const slaHours = boundedRecoverySlaHours(input.slaHours); const batchSize = Math.min(Math.max(input.batchSize ?? 50, 1), 200); const cutoff = new Date(now.getTime() - slaHours * 60 * 60_000);
    const candidates = await db.select({ id: bookingRecoveryResponses.id, companyId: bookingRecoveryResponses.companyId, recoveryCaseId: bookingRecoveryResponses.recoveryCaseId, bookingId: bookingRecoveryResponses.bookingId, clientId: bookingRecoveryResponses.clientId, createdAt: bookingRecoveryResponses.createdAt }).from(bookingRecoveryResponses).where(and(isNull(bookingRecoveryResponses.acknowledgedAt), isNull(bookingRecoveryResponses.slaEscalatedAt), sql`${bookingRecoveryResponses.createdAt} <= ${cutoff}`)).orderBy(bookingRecoveryResponses.createdAt).limit(batchSize);
    let escalated = 0; for (const candidate of candidates) { const applied = await db.transaction(async (tx) => {
      const updated = await tx.update(bookingRecoveryResponses).set({ slaEscalatedAt: now }).where(and(eq(bookingRecoveryResponses.id, candidate.id), eq(bookingRecoveryResponses.companyId, candidate.companyId), isNull(bookingRecoveryResponses.acknowledgedAt), isNull(bookingRecoveryResponses.slaEscalatedAt))).returning({ id: bookingRecoveryResponses.id }); if (!updated[0]) return false;
      await tx.update(bookingRecoveryCases).set({ priority: "urgent", updatedAt: now }).where(and(eq(bookingRecoveryCases.id, candidate.recoveryCaseId), eq(bookingRecoveryCases.companyId, candidate.companyId)));
      await tx.insert(bookingEvents).values({ companyId: candidate.companyId, bookingId: candidate.bookingId, clientId: candidate.clientId, type: "automation.booking_recovery.sla_escalated", actor: "system", payload: { recoveryCaseId: candidate.recoveryCaseId, responseId: candidate.id, slaHours, receivedAt: candidate.createdAt.toISOString(), escalatedAt: now.toISOString() } }); return true;
    }); if (applied) escalated += 1; } return { ok: true as const, inspected: candidates.length, escalated, slaHours, hasMore: candidates.length === batchSize };
  }
}
