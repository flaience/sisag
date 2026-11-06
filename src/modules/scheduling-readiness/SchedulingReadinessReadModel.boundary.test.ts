import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadinessReadModel.service.ts", "utf8");

describe("scheduling readiness read model boundary", () => {
  it("scopes every source by the trusted company and selected identifiers", () => {
    for (const table of ["companyUnits", "services", "professionals", "professionalUnits", "professionalServices", "professionalSchedules", "serviceBookingAssignmentRules", "availabilityExceptions"]) expect(source).toContain(table);
    expect(source.split("input.companyId").length - 1).toBeGreaterThanOrEqual(9);
    for (const value of ["input.unitId", "input.serviceId", "input.professionalId"]) expect(source).toContain(value);
  });

  it("returns only the sanitized evaluator contract and performs no writes", () => {
    expect(source).toContain("return evaluateSchedulingReadiness");
    for (const forbidden of [".insert(", ".update(", ".delete(", "name:", "phone", "email", "notes"]) expect(source).not.toContain(forbidden);
  });
});
