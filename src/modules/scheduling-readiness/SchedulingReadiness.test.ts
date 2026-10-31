import { describe, expect, it } from "vitest";
import { evaluateSchedulingReadiness, type SchedulingReadinessInput } from "./SchedulingReadiness";

const readyInput: SchedulingReadinessInput = {
  unitActive: true,
  serviceActive: true,
  serviceDurationMinutes: 30,
  professionalActive: true,
  professionalUnitActive: true,
  professionalServiceActive: true,
  schedules: [{ unitId: "unit-a", weekday: 1, startTime: "08:00", endTime: "12:00" }],
  assignments: [{ unitId: "unit-a", weekday: 1, startTime: "08:00", endTime: "12:00", active: true }],
  activeBlockingExceptions: 0,
};

describe("scheduling readiness", () => {
  it("marks a completely aligned configuration as ready", () => {
    expect(evaluateSchedulingReadiness(readyInput)).toEqual({
      ready: true,
      checks: expect.arrayContaining([
        { key: "professional_schedule", status: "ready" },
        { key: "assignment_coverage", status: "ready" },
      ]),
      warnings: [],
      readOnly: true,
    });
  });

  it("reports every missing prerequisite without mutating configuration", () => {
    const result = evaluateSchedulingReadiness({ ...readyInput, serviceDurationMinutes: null, professionalUnitActive: false, schedules: [], activeBlockingExceptions: 2 });
    expect(result.ready).toBe(false);
    expect(result.checks).toEqual(expect.arrayContaining([
      { key: "service_duration", status: "missing" },
      { key: "professional_unit", status: "missing" },
      { key: "professional_schedule", status: "missing" },
      { key: "assignment_coverage", status: "missing" },
    ]));
    expect(result.warnings).toEqual([{ code: "active_availability_exceptions", count: 2 }]);
    expect(result.readOnly).toBe(true);
  });

  it("requires an active assignment fully covered by one schedule", () => {
    const result = evaluateSchedulingReadiness({ ...readyInput, assignments: [{ unitId: "unit-a", weekday: 1, startTime: "11:00", endTime: "14:00", active: true }] });
    expect(result.checks).toContainEqual({ key: "assignment_coverage", status: "missing" });
  });
});
