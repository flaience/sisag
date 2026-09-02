import { and, eq } from "drizzle-orm";
import { bookingEvents, bookingRecoveryCases } from "@/drizzle/schema";

export type RecoveryCaseStatus = "open" | "contacted" | "resolved" | "dismissed";
export function recoveryPriority(score: number): "urgent" | "high" | null { return score === 1 ? "urgent" : score === 2 ? "high" : null; }

export class BookingFeedbackRecoveryService {
  static async sync(tx: any, input: { companyId: string; bookingId: string; clientId: string; feedbackId: string; score: number; actor?: string; now?: Date }) {
    const now = input.now ?? new Date();
    const rows = await tx.select({ id: bookingRecoveryCases.id, status: bookingRecoveryCases.status }).from(bookingRecoveryCases)
      .where(and(eq(bookingRecoveryCases.companyId, input.companyId), eq(bookingRecoveryCases.bookingId, input.bookingId))).limit(1);
    const existing = rows[0]; const priority = recoveryPriority(input.score);
    if (priority) {
      const saved = await tx.insert(bookingRecoveryCases).values({ companyId: input.companyId, bookingId: input.bookingId, clientId: input.clientId, feedbackId: input.feedbackId, score: input.score, priority, status: "open", openedAt: now, resolvedAt: null, resolutionNote: null })
        .onConflictDoUpdate({ target: [bookingRecoveryCases.companyId, bookingRecoveryCases.bookingId], set: { feedbackId: input.feedbackId, score: input.score, priority, status: "open", openedAt: existing?.status === "open" ? undefined : now, resolvedAt: null, resolutionNote: null, updatedAt: now } })
        .returning({ id: bookingRecoveryCases.id });
      if (!existing || existing.status !== "open") await tx.insert(bookingEvents).values({ companyId: input.companyId, bookingId: input.bookingId, clientId: input.clientId, type: "automation.booking_recovery.opened", actor: input.actor ?? "automation", payload: { recoveryCaseId: saved[0]?.id ?? existing?.id, score: input.score, priority, openedAt: now.toISOString() } });
      return { action: existing?.status === "open" ? "updated" as const : "opened" as const, recoveryCaseId: saved[0]?.id ?? existing?.id };
    }
    if (existing && (existing.status === "open" || existing.status === "contacted")) {
      await tx.update(bookingRecoveryCases).set({ status: "resolved", resolvedAt: now, resolutionNote: "Avaliação corrigida pelo cliente", updatedAt: now }).where(and(eq(bookingRecoveryCases.id, existing.id), eq(bookingRecoveryCases.companyId, input.companyId)));
      await tx.insert(bookingEvents).values({ companyId: input.companyId, bookingId: input.bookingId, clientId: input.clientId, type: "automation.booking_recovery.closed", actor: input.actor ?? "automation", payload: { recoveryCaseId: existing.id, reason: "feedback_corrected", correctedScore: input.score, resolvedAt: now.toISOString() } });
      return { action: "closed" as const, recoveryCaseId: existing.id };
    }
    return { action: "none" as const };
  }
}
