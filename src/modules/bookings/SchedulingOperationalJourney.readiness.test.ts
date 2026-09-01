import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOKING_CAPACITY_STATUSES, getBookingCapacityOccupyingStates } from "./Booking.state-contract";

describe("scheduling operational journey readiness", () => {
  it("keeps every active operational state blocking capacity", () => {
    expect(BOOKING_CAPACITY_STATUSES).toEqual(["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"]);
    expect(getBookingCapacityOccupyingStates()).toEqual([...BOOKING_CAPACITY_STATUSES]);
    const availability = fs.readFileSync("src/modules/availability/Availability.service.ts", "utf8");
    const core = fs.readFileSync("src/modules/bookings/Booking.core.ts", "utf8");
    const service = fs.readFileSync("src/modules/bookings/Booking.service.ts", "utf8");
    expect(availability).toContain("ACTIVE_BOOKING_STATUSES = BOOKING_CAPACITY_STATUSES");
    expect(core).toContain("inArray(bookings.status, BOOKING_CAPACITY_STATUSES as any)");
    expect(service).toContain("inArray(bookings.status as any, BOOKING_CAPACITY_STATUSES as any)");
  });

  it("forwards the authenticated session when the server page calls the API", () => {
    const page = fs.readFileSync("src/app/admin/bookings/page.tsx", "utf8");
    expect(page).toContain('import { cookies } from "next/headers"');
    expect(page).toContain("headers: { cookie: cookieHeader }");
  });

  it("keeps creation conflicts scoped by tenant and active status", () => {
    const service = fs.readFileSync("src/modules/bookings/Booking.service.ts", "utf8");
    expect(service).toContain("innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))");
    expect(service).toContain("eq(bookings.companyId, input.companyId)");
  });
});
