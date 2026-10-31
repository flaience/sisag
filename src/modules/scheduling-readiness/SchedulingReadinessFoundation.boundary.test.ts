import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadiness.ts", "utf8");

describe("scheduling readiness foundation boundary", () => {
  it("covers the complete minimum configuration", () => {
    for (const value of ["unitActive", "serviceActive", "serviceDurationMinutes", "professionalActive", "professionalUnitActive", "professionalServiceActive", "professional_schedule", "assignment_coverage"]) expect(source).toContain(value);
  });

  it("is read-only and treats exceptions as warnings", () => {
    expect(source).toContain('readOnly: true as const');
    expect(source).toContain("active_availability_exceptions");
    for (const forbidden of ["getDb", ".insert(", ".update(", ".delete(", "fetch("]) expect(source).not.toContain(forbidden);
  });
});
