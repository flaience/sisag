import fs from "node:fs";
import { describe, expect, it } from "vitest";
const source = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadinessSpecificTimeDiagnosis.ts", "utf8");
describe("scheduling readiness specific time diagnosis boundary", () => {
  it("explains a specific time without persistence or mutation", () => { for (const value of ["outside_professional_schedule", "outside_assignment", "assigned_to_other_professional", "unavailable_after_configuration", "scheduleCovered", "assignmentCovered", "readOnly: true"]) expect(source).toContain(value); for (const value of ["getDb", ".insert(", ".update(", ".delete(", "fetch("]) expect(source).not.toContain(value); });
  it("uses local date time and service duration", () => { for (const value of ["timeZone: timezone", "durationMinutes", "weekday(input.date)", "distanceMinutes"]) expect(source).toContain(value); });
});
