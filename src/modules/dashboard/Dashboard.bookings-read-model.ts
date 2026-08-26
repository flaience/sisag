import { and, asc, count, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  bookingItemAllocations,
  bookingItems,
  bookings,
  clients,
  professionals,
  services,
} from "@/drizzle/schema";
import type { DashboardUpcomingItem } from "./Dashboard.types";

export type DashboardBookingStatusSummary = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed: number;
  rescheduled: number;
};

type StatusRow = { status: string | null; total: number | string | null };

export function summarizeDashboardBookingStatuses(
  rows: StatusRow[],
): DashboardBookingStatusSummary {
  const summary: DashboardBookingStatusSummary = {
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
    rescheduled: 0,
  };

  for (const row of rows) {
    const quantity = Number(row.total ?? 0);
    summary.total += quantity;

    switch (row.status?.toUpperCase()) {
      case "CONFIRMED":
        summary.confirmed += quantity;
        break;
      case "PENDING":
        summary.pending += quantity;
        break;
      case "CANCELLED":
        summary.cancelled += quantity;
        break;
      case "COMPLETED":
        summary.completed += quantity;
        break;
      case "RESCHEDULED":
        summary.rescheduled += quantity;
        break;
    }
  }

  return summary;
}

type UpcomingBaseRow = {
  id: string;
  startTime: Date | string;
  status: string;
  clientName: string | null;
};

type UpcomingDetailRow = {
  bookingId: string;
  serviceName: string | null;
  professionalName: string | null;
};

export function composeDashboardUpcomingBookings(
  baseRows: UpcomingBaseRow[],
  detailRows: UpcomingDetailRow[],
): DashboardUpcomingItem[] {
  const details = new Map<string, UpcomingDetailRow>();
  for (const detail of detailRows) {
    const current = details.get(detail.bookingId);
    details.set(detail.bookingId, {
      bookingId: detail.bookingId,
      serviceName: current?.serviceName ?? detail.serviceName,
      professionalName:
        current?.professionalName ?? detail.professionalName,
    });
  }

  return baseRows.map((row) => {
    const detail = details.get(row.id);
    return {
      id: row.id,
      clientName: row.clientName ?? "Cliente não identificado",
      serviceName: detail?.serviceName ?? null,
      professionalName: detail?.professionalName ?? null,
      startTime: new Date(row.startTime).toISOString(),
      status: row.status,
    };
  });
}

export type DashboardBookingsReadWindow = {
  now: Date;
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
};

export class DashboardBookingsReadModel {
  static async getSnapshot(
    companyId: string,
    window: DashboardBookingsReadWindow,
  ) {
    if (!companyId) throw new Error("company_id_required");

    const db = getDb();
    const statusQuery = (from: Date, to: Date) =>
      db
        .select({ status: bookings.status, total: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.companyId, companyId),
            gte(bookings.startTime, from),
            lt(bookings.startTime, to),
          ),
        )
        .groupBy(bookings.status);

    const [todayRows, weekRows, upcomingRows] = await Promise.all([
      statusQuery(window.todayStart, window.todayEnd),
      statusQuery(window.weekStart, window.weekEnd),
      db
        .select({
          id: bookings.id,
          startTime: bookings.startTime,
          status: bookings.status,
          clientName: clients.name,
        })
        .from(bookings)
        .leftJoin(
          clients,
          and(
            eq(bookings.clientId, clients.id),
            eq(clients.companyId, companyId),
          ),
        )
        .where(
          and(
            eq(bookings.companyId, companyId),
            gte(bookings.startTime, window.now),
            lt(bookings.startTime, window.todayEnd),
          ),
        )
        .orderBy(asc(bookings.startTime), asc(bookings.id))
        .limit(8),
    ]);

    const bookingIds = upcomingRows.map((row) => row.id);
    const detailRows = bookingIds.length
      ? await db
          .select({
            bookingId: bookingItems.bookingId,
            serviceName: services.name,
            professionalName: professionals.name,
          })
          .from(bookingItems)
          .leftJoin(
            services,
            and(
              eq(bookingItems.serviceId, services.id),
              eq(services.companyId, companyId),
            ),
          )
          .leftJoin(
            bookingItemAllocations,
            eq(bookingItemAllocations.bookingItemId, bookingItems.id),
          )
          .leftJoin(
            professionals,
            and(
              eq(professionals.resourceId, bookingItemAllocations.resourceId),
              eq(professionals.companyId, companyId),
            ),
          )
          .where(inArray(bookingItems.bookingId, bookingIds))
      : [];

    return {
      today: summarizeDashboardBookingStatuses(todayRows),
      week: summarizeDashboardBookingStatuses(weekRows),
      upcoming: composeDashboardUpcomingBookings(upcomingRows, detailRows),
    };
  }
}
