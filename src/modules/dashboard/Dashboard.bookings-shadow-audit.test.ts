import { describe, expect, it } from "vitest";

import {
  compareDashboardBookingSnapshots,
  createDashboardBookingsReadWindow,
  type DashboardBookingShadowSnapshot,
} from "./Dashboard.bookings-shadow-audit";

function snapshot(
  overrides: Partial<DashboardBookingShadowSnapshot> = {},
): DashboardBookingShadowSnapshot {
  const empty = {
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    completed: 0,
    rescheduled: 0,
  };
  return {
    today: { ...empty },
    week: { ...empty },
    upcoming: [],
    ...overrides,
  };
}

describe("dashboard bookings shadow audit", () => {
  it("matches equivalent booking snapshots", () => {
    const value = snapshot({
      today: {
        total: 2,
        confirmed: 1,
        pending: 1,
        cancelled: 0,
        completed: 0,
        rescheduled: 0,
      },
    });
    expect(compareDashboardBookingSnapshots(value, value)).toEqual([]);
  });

  it("reports each divergent summary field", () => {
    const legacy = snapshot();
    const bookings = snapshot({
      today: {
        total: 2,
        confirmed: 1,
        pending: 1,
        cancelled: 0,
        completed: 0,
        rescheduled: 0,
      },
    });

    expect(compareDashboardBookingSnapshots(legacy, bookings)).toEqual([
      { field: "today.total", legacy: 0, bookings: 2 },
      { field: "today.confirmed", legacy: 0, bookings: 1 },
      { field: "today.pending", legacy: 0, bookings: 1 },
    ]);
  });

  it("compares upcoming data independently from aggregate identifiers", () => {
    const common = {
      clientName: "Ana",
      serviceName: "Consulta",
      professionalName: "Dra. Lia",
      startTime: "2026-08-27T12:00:00.000Z",
      status: "CONFIRMED",
    };
    const legacy = snapshot({ upcoming: [{ id: "old-1", ...common }] });
    const bookings = snapshot({ upcoming: [{ id: "new-1", ...common }] });

    expect(compareDashboardBookingSnapshots(legacy, bookings)).toEqual([]);
  });

  it("reports a meaningful upcoming divergence", () => {
    const legacy = snapshot({
      upcoming: [
        {
          id: "old-1",
          clientName: "Ana",
          serviceName: "Consulta",
          professionalName: "Dra. Lia",
          startTime: "2026-08-27T12:00:00.000Z",
          status: "CONFIRMED",
        },
      ],
    });
    expect(compareDashboardBookingSnapshots(legacy, snapshot())).toEqual([
      expect.objectContaining({ field: "upcoming", bookings: [] }),
    ]);
  });

  it("creates a deterministic Monday-to-Monday observation window", () => {
    const window = createDashboardBookingsReadWindow(
      new Date(2026, 7, 26, 15, 30, 0),
    );
    expect(window.todayStart.getDay()).toBe(3);
    expect(window.weekStart.getDay()).toBe(1);
    expect(window.weekEnd.getDay()).toBe(1);
    expect(window.todayEnd.getTime() - window.todayStart.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });
});
