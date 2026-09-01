import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { percentage } from "./BookingReminderOutcomes.presentation";
export type BookingReminderOutcomes = { sent: number; responses: number; confirmations: number; cancellations: number; completed: number; noShow: number; responseRate: number; attendanceRate: number };
export class BookingReminderOutcomesService {
  static async get(input: { companyId: string; days?: number; now?: Date }): Promise<BookingReminderOutcomes> { const days = [7, 30, 90].includes(input.days ?? 30) ? input.days ?? 30 : 30; const now = input.now ?? new Date(); const from = new Date(now.getTime() - days * 24 * 60 * 60_000); const db = getDb();
    const result = await db.execute(sql`
      with sent_jobs as (
        select distinct booking_id from automation_jobs where company_id = ${input.companyId}::uuid and type = 'booking_reminder' and status = 'done' and completed_at >= ${from} and completed_at <= ${now}
      ), response_metrics as (
        select count(*) as responses, count(*) filter (where payload->>'decision' = 'confirm') as confirmations, count(*) filter (where payload->>'decision' = 'cancel') as cancellations from booking_events where company_id = ${input.companyId}::uuid and type = 'automation.booking_reminder.responded' and created_at >= ${from} and created_at <= ${now}
      ), outcome_metrics as (
        select count(*) filter (where b.status = 'COMPLETED') as completed, count(*) filter (where b.status = 'NO_SHOW') as no_show from bookings b inner join sent_jobs s on s.booking_id = b.id where b.company_id = ${input.companyId}::uuid and b.start_time >= ${from} and b.start_time <= ${now}
      )
      select (select count(*) from automation_jobs where company_id = ${input.companyId}::uuid and type = 'booking_reminder' and status = 'done' and completed_at >= ${from} and completed_at <= ${now}) as sent, r.responses, r.confirmations, r.cancellations, o.completed, o.no_show as "noShow" from response_metrics r cross join outcome_metrics o;
    `);
    const row = ((result as any).rows ?? [])[0] ?? {}; const sent = Number(row.sent ?? 0); const responses = Number(row.responses ?? 0); const completed = Number(row.completed ?? 0); const noShow = Number(row.noShow ?? 0); return { sent, responses, confirmations: Number(row.confirmations ?? 0), cancellations: Number(row.cancellations ?? 0), completed, noShow, responseRate: percentage(responses, sent), attendanceRate: percentage(completed, completed + noShow) };
  }
}
