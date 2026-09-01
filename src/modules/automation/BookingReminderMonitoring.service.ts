import { and, desc, eq, sql } from "drizzle-orm";
import { automationJobs, bookings, clients } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
export class BookingReminderMonitoringService {
  static async get(companyId: string, limit = 30) { const db = getDb(); const bounded = Math.min(Math.max(limit, 1), 100);
    const [summaryRows, items] = await Promise.all([
      db.select({ total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where ${automationJobs.status} = 'pending')`, processing: sql<number>`count(*) filter (where ${automationJobs.status} = 'processing')`, done: sql<number>`count(*) filter (where ${automationJobs.status} = 'done')`, failed: sql<number>`count(*) filter (where ${automationJobs.status} = 'failed')` }).from(automationJobs).where(and(eq(automationJobs.companyId, companyId), eq(automationJobs.type, "booking_reminder"))),
      db.select({ id: automationJobs.id, bookingId: automationJobs.bookingId, status: automationJobs.status, runAt: automationJobs.runAt, attempts: automationJobs.attempts, completedAt: automationJobs.completedAt, lastError: automationJobs.lastError, clientName: clients.name, bookingStartTime: bookings.startTime }).from(automationJobs).leftJoin(bookings, eq(bookings.id, automationJobs.bookingId)).leftJoin(clients, eq(clients.id, automationJobs.clientId)).where(and(eq(automationJobs.companyId, companyId), eq(automationJobs.type, "booking_reminder"))).orderBy(desc(automationJobs.createdAt)).limit(bounded),
    ]);
    const row = summaryRows[0]; return { summary: { total: Number(row?.total ?? 0), pending: Number(row?.pending ?? 0), processing: Number(row?.processing ?? 0), done: Number(row?.done ?? 0), failed: Number(row?.failed ?? 0) }, items: items.map((item) => ({ ...item, runAt: item.runAt?.toISOString() ?? null, completedAt: item.completedAt?.toISOString() ?? null, bookingStartTime: item.bookingStartTime?.toISOString() ?? null })) };
  }
}
