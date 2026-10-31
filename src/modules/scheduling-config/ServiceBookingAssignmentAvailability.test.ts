import { describe, expect, it } from "vitest";
import { isAssignmentCoveredByProfessionalSchedule } from "./ServiceBookingAssignmentAvailability";

const schedules = [
  { unitId: "unit-a", weekday: 1, startTime: "08:00", endTime: "12:00" },
  { unitId: "unit-a", weekday: 1, startTime: "13:00", endTime: "18:00" },
];

describe("service booking assignment availability", () => {
  it("accepts a turn fully covered by one professional period", () => {
    expect(isAssignmentCoveredByProfessionalSchedule({ unitId: "unit-a", weekday: 1, startTime: "13:00", endTime: "17:00" }, schedules)).toBe(true);
  });

  it("rejects gaps, another unit, another day and an invalid period", () => {
    expect(isAssignmentCoveredByProfessionalSchedule({ unitId: "unit-a", weekday: 1, startTime: "11:00", endTime: "14:00" }, schedules)).toBe(false);
    expect(isAssignmentCoveredByProfessionalSchedule({ unitId: "unit-b", weekday: 1, startTime: "13:00", endTime: "17:00" }, schedules)).toBe(false);
    expect(isAssignmentCoveredByProfessionalSchedule({ unitId: "unit-a", weekday: 2, startTime: "13:00", endTime: "17:00" }, schedules)).toBe(false);
    expect(isAssignmentCoveredByProfessionalSchedule({ unitId: "unit-a", weekday: 1, startTime: "18:00", endTime: "13:00" }, schedules)).toBe(false);
  });
});
