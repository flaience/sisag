import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";

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

function startOfWeekLocal() {
  const today = startOfTodayLocal();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
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
    const weekStart = startOfWeekLocal();
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekRows = await db
      .select({
        status: appointments.status,
        total: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, companyId),
          gte(appointments.scheduledTime, weekStart),
          lt(appointments.scheduledTime, weekEnd),
        ),
      )
      .groupBy(appointments.status);

    let weekTotal = 0;
    let weekConfirmed = 0;
    let weekPending = 0;
    let weekCancelled = 0;
    let weekCompleted = 0;
    let weekRescheduled = 0;

    for (const row of weekRows) {
      const qty = Number(row.total ?? 0);
      weekTotal += qty;

      switch (row.status) {
        case "CONFIRMED":
          weekConfirmed += qty;
          break;
        case "PENDING":
          weekPending += qty;
          break;
        case "CANCELLED":
          weekCancelled += qty;
          break;
        case "COMPLETED":
          weekCompleted += qty;
          break;
        case "RESCHEDULED":
          weekRescheduled += qty;
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

    let receivedToday = 0;
    let sentToday = 0;
    let deliveredToday = 0;
    let readToday = 0;
    let failedToday = 0;

    for (const row of messagingRows) {
      const qty = Number(row.total ?? 0);

      switch (row.status) {
        case "received":
          receivedToday += qty;
          break;
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

    const recentMessageRows = await db
      .select({
        id: messageLogs.id,
        provider: messageLogs.provider,
        status: messageLogs.status,
        toPhone: messageLogs.toPhone,
        body: messageLogs.body,
        createdAt: messageLogs.createdAt,
      })
      .from(messageLogs)
      .where(eq(messageLogs.companyId, companyId))
      .orderBy(desc(messageLogs.createdAt))
      .limit(8);

    const recentMessages = recentMessageRows.map((row) => ({
      id: String(row.id),
      provider: row.provider,
      status: row.status,
      toPhone: row.toPhone,
      body: row.body,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    }));

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
      week: {
        total: weekTotal,
        confirmed: weekConfirmed,
        pending: weekPending,
        cancelled: weekCancelled,
        completed: weekCompleted,
        rescheduled: weekRescheduled,
      },
      upcoming,
      messaging: {
        receivedToday,
        sentToday,
        deliveredToday,
        readToday,
        failedToday,
        lastMessageAt: lastMessageRow?.[0]?.lastAt
          ? new Date(lastMessageRow[0].lastAt).toISOString()
          : null,
        recent: recentMessages,
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
