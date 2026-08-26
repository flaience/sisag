import { describe, expect, it } from "vitest";

import {
  composeDashboardUpcomingBookings,
  summarizeDashboardBookingStatuses,
} from "./Dashboard.bookings-read-model";

describe("dashboard bookings read model", () => {
  it("summarizes current and legacy persisted statuses", () => {
    expect(
      summarizeDashboardBookingStatuses([
        { status: "PENDING", total: 2 },
        { status: "CONFIRMED", total: "3" },
        { status: "CANCELLED", total: 1 },
        { status: "COMPLETED", total: 4 },
        { status: "RESCHEDULED", total: 1 },
      ]),
    ).toEqual({
      total: 11,
      pending: 2,
      confirmed: 3,
      cancelled: 1,
      completed: 4,
      rescheduled: 1,
    });
  });

  it("keeps unknown status in total without inventing a category", () => {
    expect(
      summarizeDashboardBookingStatuses([{ status: "FUTURE", total: 2 }]),
    ).toEqual({
      total: 2,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      rescheduled: 0,
    });
  });

  it("composes upcoming bookings without duplicating allocations", () => {
    const result = composeDashboardUpcomingBookings(
      [
        {
          id: "booking-1",
          startTime: "2026-08-27T12:00:00.000Z",
          status: "CONFIRMED",
          clientName: "Ana",
        },
      ],
      [
        {
          bookingId: "booking-1",
          serviceName: "Consulta",
          professionalName: null,
        },
        {
          bookingId: "booking-1",
          serviceName: "Consulta",
          professionalName: "Dra. Lia",
        },
      ],
    );

    expect(result).toEqual([
      {
        id: "booking-1",
        clientName: "Ana",
        serviceName: "Consulta",
        professionalName: "Dra. Lia",
        startTime: "2026-08-27T12:00:00.000Z",
        status: "CONFIRMED",
      },
    ]);
  });

  it("uses safe fallbacks when optional relations are absent", () => {
    expect(
      composeDashboardUpcomingBookings(
        [
          {
            id: "booking-2",
            startTime: "2026-08-27T13:00:00.000Z",
            status: "PENDING",
            clientName: null,
          },
        ],
        [],
      ),
    ).toMatchObject([
      {
        clientName: "Cliente não identificado",
        serviceName: null,
        professionalName: null,
      },
    ]);
  });
});
