import { and, eq, inArray } from "drizzle-orm";
import { automationJobs, automationRules, bookings, clients } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export function calculateReminderRunAt(startTime: Date, hoursBefore: number) {
  return new Date(startTime.getTime() - Math.max(0, hoursBefore) * 60 * 60 * 1000);
}
export function bookingReminderDedupeKey(bookingId: string, startTime: Date) {
  return `booking-reminder:${bookingId}:${startTime.toISOString()}`;
}

export class BookingReminderPlannerService {
  static async plan(input: { companyId: string; bookingId: string; now?: Date }) {
    const db = getDb();
    const rows = await db.select({
      bookingId: bookings.id, companyId: bookings.companyId, clientId: bookings.clientId,
      startTime: bookings.startTime, status: bookings.status,
      clientPhone: clients.phoneE164, clientName: clients.name,
      enabled: automationRules.enablePrecheckin, hoursBefore: automationRules.precheckinHoursBefore,
      templates: automationRules.templates,
    }).from(bookings)
      .innerJoin(clients, eq(clients.id, bookings.clientId))
      .leftJoin(automationRules, eq(automationRules.companyId, bookings.companyId))
      .where(and(eq(bookings.id, input.bookingId), eq(bookings.companyId, input.companyId))).limit(1);
    const booking = rows[0];
    if (!booking) return { ok: false as const, error: "booking_not_found" as const };
    if (!booking.enabled) return { ok: true as const, scheduled: false as const, reason: "automation_disabled" as const };
    if (!booking.clientPhone) return { ok: true as const, scheduled: false as const, reason: "client_without_phone" as const };
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { ok: true as const, scheduled: false as const, reason: "inactive_booking" as const };
    const runAt = calculateReminderRunAt(new Date(booking.startTime), booking.hoursBefore ?? 24);
    if (runAt.getTime() <= (input.now ?? new Date()).getTime()) return { ok: true as const, scheduled: false as const, reason: "reminder_window_passed" as const };
    const dedupeKey = bookingReminderDedupeKey(booking.bookingId, new Date(booking.startTime));
    await db.update(automationJobs).set({ status: "cancelled", lastError: "Substituído por novo planejamento", updatedAt: new Date() })
      .where(and(eq(automationJobs.companyId, input.companyId), eq(automationJobs.bookingId, input.bookingId), eq(automationJobs.type, "booking_reminder"), inArray(automationJobs.status, ["pending", "failed"])));
    const inserted = await db.insert(automationJobs).values({
      companyId: booking.companyId, bookingId: booking.bookingId, clientId: booking.clientId,
      type: "booking_reminder", status: "pending", runAt, dedupeKey,
      payload: { channel: "whatsapp", toPhone: booking.clientPhone, clientName: booking.clientName, bookingStartTime: new Date(booking.startTime).toISOString(), template: (booking.templates as any)?.bookingReminder ?? null },
    }).onConflictDoNothing({ target: automationJobs.dedupeKey }).returning({ id: automationJobs.id });
    return { ok: true as const, scheduled: true as const, jobId: inserted[0]?.id ?? null, dedupeKey, runAt: runAt.toISOString(), reused: inserted.length === 0 };
  }

  static async cancel(input: { companyId: string; bookingId: string; reason: string }) {
    const rows = await getDb().update(automationJobs).set({ status: "cancelled", lastError: input.reason, lockedAt: null, updatedAt: new Date() })
      .where(and(eq(automationJobs.companyId, input.companyId), eq(automationJobs.bookingId, input.bookingId), eq(automationJobs.type, "booking_reminder"), inArray(automationJobs.status, ["pending", "failed", "processing"])))
      .returning({ id: automationJobs.id });
    return { ok: true as const, cancelled: rows.length };
  }

  static async planSafely(input: { companyId: string; bookingId: string }) {
    try { return await this.plan(input); }
    catch (error) { console.error("Booking reminder planning failed", { ...input, error }); return { ok: false as const, error: "planning_failed" as const }; }
  }

  static async cancelSafely(input: { companyId: string; bookingId: string; reason: string }) {
    try { return await this.cancel(input); }
    catch (error) { console.error("Booking reminder cancellation failed", { ...input, error }); return { ok: false as const, error: "cancellation_failed" as const }; }
  }
}
