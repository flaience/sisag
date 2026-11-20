import { describe, expect, it } from "vitest";
import { evaluateArrivalPeriodCapacity } from "./ServiceArrivalPeriodCapacity";

describe("service arrival period capacity", () => {
  it("keeps an unlimited period open", () => {
    expect(evaluateArrivalPeriodCapacity(null, 200)).toEqual({ capacity: null, reserved: 200, available: true, remaining: null });
  });

  it("reports bounded availability without creating a queue position", () => {
    expect(evaluateArrivalPeriodCapacity(30, 28)).toEqual({ capacity: 30, reserved: 28, available: true, remaining: 2 });
    expect(evaluateArrivalPeriodCapacity(30, 30)).toEqual({ capacity: 30, reserved: 30, available: false, remaining: 0 });
  });
});
