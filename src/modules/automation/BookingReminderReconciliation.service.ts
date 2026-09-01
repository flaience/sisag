import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { automationJobs, automationRules, bookings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingReminderPlannerService } from "./BookingReminderPlanner.service";

export class BookingReminderReconciliationService {
  static async reconcileCompany(input: { companyId: string; now?: Date; limit?: number }) {
    const db = getDb(); const now = input.now ?? new Date(); const limit = Math.min(Math.max(input.limit ?? 200, 1), 1000);
    const active = await db.select({ bookingId: bookings.id }).from(bookings)
      .innerJoin(automationRules, eq(automationRules.companyId, bookings.companyId))
      .where(and(eq(bookings.companyId, input.companyId), eq(automationRules.enablePrecheckin, true), inArray(bookings.status, ["PENDING", "CONFIRMED"]), gt(bookings.startTime, now))).limit(limit);
    let planned = 0; let failed = 0;
    for (const item of active) { const result = await BookingReminderPlannerService.planSafely({ companyId: input.companyId, bookingId: item.bookingId }); if (result.ok) planned += 1; else failed += 1; }
    const cancelled = await db.execute(sql`update automation_jobs j set status = 'cancelled', last_error = 'Reconciliação: booking inativo ou inexistente', locked_at = null, completed_at = ${now}, updated_at = ${now} where j.company_id = ${input.companyId}::uuid and j.type = 'booking_reminder' and j.status in ('pending','failed','processing') and not exists (select 1 from bookings b where b.id = j.booking_id and b.company_id = j.company_id and b.status in ('PENDING','CONFIRMED') and b.start_time > ${now}) returning j.id`);
    return { ok: true as const, scanned: active.length, planned, failed, cancelled: ((cancelled as any).rows ?? []).length };
  }
}
