import { and, asc, count, eq, gte, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  appointments,
  automationJobs,
  clients,
  messageLogs,
  professionals,
} from "@/drizzle/schema";

import type {
  AdminDashboardData,
  DashboardUpcomingItem,
} from "./Dashboard.types";

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function endOfTodayLocal() {
  const start = startOfTodayLocal();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export class DashboardService {
  static async getAdminDashboard(
    companyId: string,
  ): Promise<AdminDashboardData> {
    const db = getDb();

    const now = new Date();
    const todayStart = startOfTodayLocal();
    const todayEnd = endOfTodayLocal();

    const todayRows = await db
      .select({
        status: appointments.status,
        total: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, companyId),
          gte(appointments.scheduledTime, todayStart),
          lt(appointments.scheduledTime, todayEnd),
        ),
      )
      .groupBy(appointments.status);

    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    let completed = 0;
    let rescheduled = 0;

    for (const row of todayRows) {
      const qty = Number(row.total ?? 0);
      total += qty;

      switch (row.status) {
        case "CONFIRMED":
          confirmed += qty;
          break;
        case "PENDING":
          pending += qty;
          break;
        case "CANCELLED":
          cancelled += qty;
          break;
        case "COMPLETED":
          completed += qty;
          break;
        case "RESCHEDULED":
          rescheduled += qty;
          break;
      }
    }

    const upcomingRows = await db
      .select({
        id: appointments.id,
        startTime: appointments.scheduledTime,
        status: appointments.status,
        clientName: clients.name,
        professionalName: professionals.name,
        serviceName: appointments.serviceNameSnapshot,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(
        professionals,
        eq(appointments.professionalId, professionals.id),
      )
      .where(
        and(
          eq(appointments.companyId, companyId),
          gte(appointments.scheduledTime, now),
          lt(appointments.scheduledTime, todayEnd),
        ),
      )
      .orderBy(asc(appointments.scheduledTime))
      .limit(8);

    const upcoming: DashboardUpcomingItem[] = upcomingRows.map((row) => ({
      id: String(row.id),
      clientName: row.clientName ?? "Cliente não identificado",
      serviceName: row.serviceName ?? null,
      startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
      status: row.status ?? "PENDING",
      professionalName: row.professionalName ?? null,
    }));

    const messagingRows = await db
      .select({
        status: messageLogs.status,
        total: count(),
      })
      .from(messageLogs)
      .where(
        and(
          eq(messageLogs.companyId, companyId),
          gte(messageLogs.createdAt, todayStart),
          lt(messageLogs.createdAt, todayEnd),
        ),
      )
      .groupBy(messageLogs.status);

    let sentToday = 0;
    let deliveredToday = 0;
    let readToday = 0;
    let failedToday = 0;

    for (const row of messagingRows) {
      const qty = Number(row.total ?? 0);

      switch (row.status) {
        case "sent":
          sentToday += qty;
          break;
        case "delivered":
          deliveredToday += qty;
          break;
        case "read":
          readToday += qty;
          break;
        case "failed":
          failedToday += qty;
          break;
      }
    }

    const lastMessageRow = await db
      .select({
        lastAt: sql<Date | null>`max(${messageLogs.createdAt})`,
      })
      .from(messageLogs)
      .where(eq(messageLogs.companyId, companyId));

    const pendingAutomationRows = await db
      .select({
        total: count(),
      })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.companyId, companyId),
          eq(automationJobs.status, "pending"),
        ),
      );

    const failedAutomationRows = await db
      .select({
        total: count(),
      })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.companyId, companyId),
          eq(automationJobs.status, "failed"),
        ),
      );

    const completedTodayRows = await db
      .select({
        total: count(),
      })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.companyId, companyId),
          eq(automationJobs.status, "done"),
          gte(automationJobs.updatedAt, todayStart),
          lt(automationJobs.updatedAt, todayEnd),
        ),
      );

    const nextAutomationRow = await db
      .select({
        runAt: automationJobs.runAt,
      })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.companyId, companyId),
          eq(automationJobs.status, "pending"),
          gte(automationJobs.runAt, now),
        ),
      )
      .orderBy(asc(automationJobs.runAt))
      .limit(1);

    const automationPending = Number(pendingAutomationRows[0]?.total ?? 0);
    const automationFailed = Number(failedAutomationRows[0]?.total ?? 0);
    const automationCompletedToday = Number(completedTodayRows[0]?.total ?? 0);

    return {
      today: {
        total,
        confirmed,
        pending,
        cancelled,
        completed,
        rescheduled,
      },
      upcoming,
      messaging: {
        sentToday,
        deliveredToday,
        readToday,
        failedToday,
        lastMessageAt: lastMessageRow?.[0]?.lastAt
          ? new Date(lastMessageRow[0].lastAt).toISOString()
          : null,
      },
      automations: {
        pending: automationPending,
        completedToday: automationCompletedToday,
        failed: automationFailed,
        nextRunAt: nextAutomationRow?.[0]?.runAt
          ? new Date(nextAutomationRow[0].runAt).toISOString()
          : null,
      },
      health: {
        agendaHealthy: true,
        messagingHealthy: failedToday === 0,
        automationsHealthy: automationFailed === 0,
      },
    };
  }
}
