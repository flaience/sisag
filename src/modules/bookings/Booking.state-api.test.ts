import { describe, expect, it } from "vitest";

import { getBookingStateApiView } from "./Booking.state-api";

describe("booking state API contract", () => {
  it("exposes pending state and its allowed actions", () => {
    expect(getBookingStateApiView("PENDING")).toEqual({
      persistedStatus: "PENDING",
      state: "pending",
      category: "active",
      occupiesCapacity: true,
      translationKey: "booking.status.pending",
      availableActions: ["confirm", "cancel", "reschedule"],
    });
  });

  it("exposes confirmed state and its allowed actions", () => {
    expect(getBookingStateApiView("confirmed")).toMatchObject({
      persistedStatus: "CONFIRMED",
      state: "confirmed",
      category: "active",
      occupiesCapacity: true,
      availableActions: ["cancel", "reschedule", "complete"],
    });
  });

  it.each(["CANCELLED", "COMPLETED"])(
    "exposes terminal state %s without actions",
    (status) => {
      expect(getBookingStateApiView(status)).toMatchObject({
        category: "terminal",
        occupiesCapacity: false,
        availableActions: [],
      });
    },
  );

  it("exposes legacy rescheduled state without enabling writes", () => {
    expect(getBookingStateApiView("RESCHEDULED")).toMatchObject({
      state: "rescheduled",
      category: "compatibility",
      availableActions: [],
    });
  });

  it.each([null, undefined, "", "NO_SHOW", "EXPIRED", "unknown"])(
    "rejects unsupported persisted value %s",
    (status) => {
      expect(getBookingStateApiView(status)).toBeNull();
    },
  );
});
