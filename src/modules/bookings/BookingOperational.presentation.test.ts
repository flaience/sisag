import { describe, expect, it } from "vitest";
import { BOOKING_STATUS_PRESENTATION, canCancelBooking, canMarkNoShow, getPrimaryOperationalAction } from "./BookingOperational.presentation";
describe("booking operational presentation", () => {
  it("guides the operator through one primary next action", () => { expect(getPrimaryOperationalAction("PENDING")).toBe("confirm"); expect(getPrimaryOperationalAction("CONFIRMED")).toBe("arrive"); expect(getPrimaryOperationalAction("ARRIVED")).toBe("start"); expect(getPrimaryOperationalAction("IN_PROGRESS")).toBe("complete"); expect(getPrimaryOperationalAction("COMPLETED")).toBeNull(); });
  it("separates exceptional destructive actions", () => { expect(canMarkNoShow("CONFIRMED")).toBe(true); expect(canMarkNoShow("IN_PROGRESS")).toBe(false); expect(canCancelBooking("PENDING")).toBe(true); expect(canCancelBooking("ARRIVED")).toBe(false); });
  it("uses Portuguese business labels", () => { expect(BOOKING_STATUS_PRESENTATION.ARRIVED.label).toBe("Cliente chegou"); expect(BOOKING_STATUS_PRESENTATION.IN_PROGRESS.label).toBe("Em atendimento"); expect(BOOKING_STATUS_PRESENTATION.NO_SHOW.label).toBe("Não compareceu"); });
});
