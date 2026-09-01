import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { automationJobs, bookings, clients, outbox, schedulingConfig } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const REMINDER_MAX_ATTEMPTS = 5;
export function reminderRetryDelayMinutes(attempts: number) { return Math.min(60, Math.max(1, 2 ** Math.max(0, attempts - 1))); }
export function reminderOutboxDedupeKey(jobDedupeKey: string) { return `booking-reminder-send:${jobDedupeKey}`; }
export function renderBookingReminder(input: { clientName?: string | null; startTime: Date; timezone: string; template?: string | null }) {
  const when = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timezone, dateStyle: "short", timeStyle: "short" }).format(input.startTime);
  const greeting = input.clientName?.trim() ? `Olá, ${input.clientName.trim()}! ` : "Olá! ";
  const fallback = `${greeting}Lembramos que seu atendimento está marcado para ${when}. Responda *SIM* para confirmar ou *CANCELAR* se não puder comparecer.`;
  return input.template?.trim() ? input.template.replaceAll("{{nome}}", input.clientName?.trim() || "cliente").replaceAll("{{data_hora}}", when) : fallback;
}

type ClaimedJob = { id: string; companyId: string; bookingId: string; dedupeKey: string; attempts: number; payload?: { template?: string | null } | null };
export class BookingReminderWorkerService {
  static async run(input: { workerId: string; batchSize?: number; now?: Date }) {
    const db = getDb(); const now = input.now ?? new Date(); const batchSize = Math.min(Math.max(input.batchSize ?? 20, 1), 100);
    const claimedResult = await db.execute(sql`
      with candidates as (
        select id from automation_jobs
        where type = 'booking_reminder'
          and ((status in ('pending','failed') and run_at <= ${now})
            or (status = 'processing' and locked_at < ${new Date(now.getTime() - 10 * 60_000)}))
          and attempts < ${REMINDER_MAX_ATTEMPTS}
        order by run_at asc
        for update skip locked
        limit ${batchSize}
      )
      update automation_jobs j set status = 'processing', locked_at = ${now}, attempts = j.attempts + 1, last_error = null, updated_at = ${now}
      from candidates where j.id = candidates.id
      returning j.id, j.company_id as "companyId", j.booking_id as "bookingId", j.dedupe_key as "dedupeKey", j.attempts, j.payload;
    `);
    const claimed = ((claimedResult as any).rows ?? claimedResult ?? []) as ClaimedJob[];
    const summary = { claimed: claimed.length, sent: 0, retried: 0, cancelled: 0 };
    for (const job of claimed) {
      try { const outcome = await this.process(job, now); if (outcome === "sent") summary.sent += 1; else summary.cancelled += 1; }
      catch (error) { await this.retry(job, error, now); summary.retried += 1; }
    }
    return { ok: true as const, ...summary };
  }

  private static async process(job: ClaimedJob, now: Date): Promise<"sent" | "cancelled"> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const rows = await tx.select({ bookingId: bookings.id, companyId: bookings.companyId, clientId: bookings.clientId, startTime: bookings.startTime, status: bookings.status, phone: clients.phoneE164, clientName: clients.name, timezone: schedulingConfig.timezone })
        .from(bookings).innerJoin(clients, eq(clients.id, bookings.clientId)).leftJoin(schedulingConfig, eq(schedulingConfig.companyId, bookings.companyId))
        .where(and(eq(bookings.id, job.bookingId), eq(bookings.companyId, job.companyId))).limit(1);
      const booking = rows[0];
      const invalidReason = !booking ? "booking_not_found" : !["PENDING", "CONFIRMED"].includes(booking.status) ? "booking_inactive" : !booking.phone ? "client_without_phone" : new Date(booking.startTime).getTime() <= now.getTime() ? "booking_started" : null;
      if (invalidReason) {
        await tx.update(automationJobs).set({ status: "cancelled", lastError: invalidReason, lockedAt: null, completedAt: now, updatedAt: now }).where(and(eq(automationJobs.id, job.id), eq(automationJobs.status, "processing")));
        return "cancelled";
      }
      const message = renderBookingReminder({ clientName: booking.clientName, startTime: new Date(booking.startTime), timezone: booking.timezone ?? "America/Sao_Paulo", template: job.payload?.template });
      const inserted = await tx.insert(outbox).values({ aggregateType: "booking", aggregateId: booking.bookingId, eventType: "whatsapp.send.requested", payload: { companyId: booking.companyId, bookingId: booking.bookingId, clientId: booking.clientId, toPhone: booking.phone, text: message, correlationId: job.dedupeKey, meta: { source: "booking_reminder", emittedAt: now.toISOString() } }, status: "pending", attempts: 0, dedupeKey: reminderOutboxDedupeKey(job.dedupeKey), createdAt: now, updatedAt: now })
        .onConflictDoNothing().returning({ id: outbox.id });
      const existing = inserted[0] ?? (await tx.select({ id: outbox.id }).from(outbox).where(eq(outbox.dedupeKey, reminderOutboxDedupeKey(job.dedupeKey))).limit(1))[0];
      await tx.update(automationJobs).set({ status: "done", outboxId: existing?.id ?? null, lockedAt: null, completedAt: now, updatedAt: now }).where(and(eq(automationJobs.id, job.id), eq(automationJobs.status, "processing")));
      return "sent";
    });
  }

  private static async retry(job: ClaimedJob, error: unknown, now: Date) {
    const terminal = job.attempts >= REMINDER_MAX_ATTEMPTS; const delay = reminderRetryDelayMinutes(job.attempts);
    await getDb().update(automationJobs).set({ status: terminal ? "failed" : "pending", runAt: new Date(now.getTime() + delay * 60_000), lockedAt: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "unknown_error", completedAt: terminal ? now : null, updatedAt: now }).where(eq(automationJobs.id, job.id));
  }
}
