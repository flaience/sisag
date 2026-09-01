import { describe, expect, it } from "vitest";

import {
  applyBookingAction,
  bookingLifecycleStates,
  bookingStateDefinitions,
  canApplyBookingAction,
  getBookingStateDefinition,
  isPersistedBookingState,
} from "./Booking.state-contract";

describe("booking state contract", () => {
  it("declares the supported lifecycle vocabulary", () => {
    expect(bookingLifecycleStates).toEqual([
      "PENDING",
      "CONFIRMED",
      "ARRIVED",
      "IN_PROGRESS",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
    ]);
  });

  it.each([
    ["PENDING", "confirm", "CONFIRMED"],
    ["PENDING", "cancel", "CANCELLED"],
    ["PENDING", "reschedule", "PENDING"],
    ["CONFIRMED", "cancel", "CANCELLED"],
    ["CONFIRMED", "reschedule", "CONFIRMED"],
    ["CONFIRMED", "arrive", "ARRIVED"],
    ["ARRIVED", "start", "IN_PROGRESS"],
    ["IN_PROGRESS", "complete", "COMPLETED"],
    ["CONFIRMED", "no_show", "NO_SHOW"],
  ] as const)("applies %s + %s -> %s", (from, action, to) => {
    expect(applyBookingAction(from, action)).toBe(to);
  });

  it.each([
    ["PENDING", "complete"],
    ["CONFIRMED", "confirm"],
    ["CANCELLED", "confirm"],
    ["CANCELLED", "reschedule"],
    ["COMPLETED", "cancel"],
    ["COMPLETED", "reschedule"],
  ] as const)("rejects invalid transition %s + %s", (from, action) => {
    expect(canApplyBookingAction(from, action)).toBe(false);
  });

  it("models rescheduling as an event that preserves lifecycle state", () => {
    expect(applyBookingAction("PENDING", "reschedule")).toBe("PENDING");
    expect(applyBookingAction("CONFIRMED", "reschedule")).toBe("CONFIRMED");
  });

  it("keeps RESCHEDULED readable but prevents new lifecycle writes", () => {
    const legacy = getBookingStateDefinition("RESCHEDULED");
    expect(legacy).toMatchObject({
      category: "compatibility",
      acceptsNewWrites: false,
      occupiesCapacity: false,
    });
    expect(canApplyBookingAction("RESCHEDULED", "confirm")).toBe(false);
  });

  it("keeps translation concerns outside domain rules", () => {
    expect(bookingStateDefinitions.every((item) =>
      item.translationKey.startsWith("booking.status."),
    )).toBe(true);
  });

  it("identifies persisted values without accepting future-only states", () => {
    expect(isPersistedBookingState("PENDING")).toBe(true);
    expect(isPersistedBookingState("RESCHEDULED")).toBe(true);
    expect(isPersistedBookingState("NO_SHOW")).toBe(true);
    expect(isPersistedBookingState("expired")).toBe(false);
  });
});
