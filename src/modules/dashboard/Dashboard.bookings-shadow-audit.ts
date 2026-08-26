import { DashboardService } from "./Dashboard.service";
import {
  DashboardBookingsReadModel,
  type DashboardBookingStatusSummary,
  type DashboardBookingsReadWindow,
} from "./Dashboard.bookings-read-model";
import type { DashboardUpcomingItem } from "./Dashboard.types";

export type DashboardBookingShadowSnapshot = {
  today: DashboardBookingStatusSummary;
  week: DashboardBookingStatusSummary;
  upcoming: DashboardUpcomingItem[];
};

export type DashboardBookingShadowDifference = {
  field: string;
  legacy: unknown;
  bookings: unknown;
};

const summaryFields = [
  "total",
  "confirmed",
  "pending",
  "cancelled",
  "completed",
  "rescheduled",
] as const;

function upcomingSignature(item: DashboardUpcomingItem) {
  return [
    item.startTime ?? "",
    item.status,
    item.clientName ?? "",
    item.serviceName ?? "",
    item.professionalName ?? "",
  ].join("|");
}

export function compareDashboardBookingSnapshots(
  legacy: DashboardBookingShadowSnapshot,
  bookingsSnapshot: DashboardBookingShadowSnapshot,
): DashboardBookingShadowDifference[] {
  const differences: DashboardBookingShadowDifference[] = [];

  for (const period of ["today", "week"] as const) {
    for (const field of summaryFields) {
      if (legacy[period][field] !== bookingsSnapshot[period][field]) {
        differences.push({
          field: period + "." + field,
          legacy: legacy[period][field],
          bookings: bookingsSnapshot[period][field],
        });
      }
    }
  }

  const legacyUpcoming = legacy.upcoming.map(upcomingSignature).sort();
  const bookingsUpcoming = bookingsSnapshot.upcoming
    .map(upcomingSignature)
    .sort();

  if (JSON.stringify(legacyUpcoming) !== JSON.stringify(bookingsUpcoming)) {
    differences.push({
      field: "upcoming",
      legacy: legacyUpcoming,
      bookings: bookingsUpcoming,
    });
  }

  return differences;
}

export function createDashboardBookingsReadWindow(
  now: Date,
): DashboardBookingsReadWindow {
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const day = todayStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth(),
    todayStart.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { now, todayStart, todayEnd, weekStart, weekEnd };
}

export class DashboardBookingsShadowAuditService {
  static async observe(companyId: string, now = new Date()) {
    if (!companyId) throw new Error("company_id_required");

    const [legacyDashboard, bookingsSnapshot] = await Promise.all([
      DashboardService.getAdminDashboard(companyId),
      DashboardBookingsReadModel.getSnapshot(
        companyId,
        createDashboardBookingsReadWindow(now),
      ),
    ]);

    const legacy: DashboardBookingShadowSnapshot = {
      today: legacyDashboard.today,
      week: legacyDashboard.week,
      upcoming: legacyDashboard.upcoming,
    };
    const differences = compareDashboardBookingSnapshots(
      legacy,
      bookingsSnapshot,
    );

    return {
      recordedAt: now.toISOString(),
      matched: differences.length === 0,
      status: differences.length === 0 ? ("healthy" as const) : ("divergent" as const),
      differences,
      legacy,
      bookings: bookingsSnapshot,
    };
  }
}
