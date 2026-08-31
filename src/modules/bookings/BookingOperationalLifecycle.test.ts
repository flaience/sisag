import { describe, expect, it } from "vitest";
import { applyBookingAction, canApplyBookingAction } from "./Booking.state-contract";
describe("booking operational lifecycle", () => {
  it("requires the safe operational sequence", () => {
    expect(applyBookingAction("CONFIRMED", "arrive")).toBe("ARRIVED");
    expect(applyBookingAction("ARRIVED", "start")).toBe("IN_PROGRESS");
    expect(applyBookingAction("IN_PROGRESS", "complete")).toBe("COMPLETED");
  });
  it("supports absence without allowing invalid shortcuts", () => {
    expect(applyBookingAction("CONFIRMED", "no_show")).toBe("NO_SHOW");
    expect(canApplyBookingAction("PENDING", "complete")).toBe(false);
    expect(canApplyBookingAction("CONFIRMED", "complete")).toBe(false);
    expect(canApplyBookingAction("COMPLETED", "start")).toBe(false);
  });
});
