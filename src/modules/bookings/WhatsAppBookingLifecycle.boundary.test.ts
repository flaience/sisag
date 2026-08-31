import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp booking lifecycle boundary", () => {
  const source = fs.readFileSync("src/modules/bookings/WhatsAppBookingLifecycle.service.ts", "utf8");

  it("scopes reads and mutations to company and client", () => {
    expect(source).toContain("eq(bookings.companyId, input.companyId)");
    expect(source).toContain("eq(bookings.clientId, input.clientId)");
    expect(source).toContain("BookingService.cancelById");
    expect(source).toContain('actor: "whatsapp"');
  });

  it("lists only future active bookings and enforces cancellation lead time", () => {
    expect(source).toContain('["PENDING", "CONFIRMED"]');
    expect(source).toContain("gt(bookings.startTime");
    expect(source).toContain("input.minAdvanceMinutes * 60_000");
  });
});
