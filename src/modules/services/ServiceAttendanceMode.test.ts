import { describe, expect, it } from "vitest";
import { getServiceAttendancePolicy } from "./ServiceAttendanceMode";

describe("service attendance mode", () => {
  it("keeps the existing exact-time scheduling contract", () => {
    expect(getServiceAttendancePolicy("scheduled_time")).toEqual({
      mode: "scheduled_time",
      requiresExactTime: true,
      requiresServicePeriod: false,
      queuePositionAssignedAtCheckIn: false,
    });
  });

  it("separates a service period from the arrival queue", () => {
    expect(getServiceAttendancePolicy("arrival_order")).toEqual({
      mode: "arrival_order",
      requiresExactTime: false,
      requiresServicePeriod: true,
      queuePositionAssignedAtCheckIn: true,
    });
  });
});
