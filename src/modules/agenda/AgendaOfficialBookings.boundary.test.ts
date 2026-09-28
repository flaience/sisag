import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/agenda/Agenda.service.ts", "utf8");

describe("agenda official bookings boundary", () => {
  it("reads the official booking aggregate instead of legacy appointments", () => {
    expect(source).toContain(".from(bookings)");
    expect(source).toContain(".from(bookingItems)");
    expect(source).toContain("bookingItemAllocations");
    expect(source).not.toContain(".from(appointments)");
    expect(source).not.toContain("appointments.scheduledTime");
  });

  it("keeps tenant and local-day boundaries explicit", () => {
    expect(source).toContain("eq(bookings.companyId, companyId)");
    expect(source).toContain("DEFAULT_TIMEZONE");
    expect(source).toContain("eq(professionals.companyId, companyId)");
  });
});
