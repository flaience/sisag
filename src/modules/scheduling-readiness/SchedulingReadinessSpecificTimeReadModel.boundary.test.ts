import fs from "node:fs";
import { describe, expect, it } from "vitest";
const source = fs.readFileSync("src/modules/scheduling-readiness/SchedulingReadinessSpecificTimeReadModel.service.ts", "utf8");
describe("scheduling readiness specific time read model boundary", () => {
  it("scopes every source by authenticated company input", () => { for (const value of ["services.companyId", "professionalServices.companyId", "professionalSchedules.companyId", "serviceBookingAssignmentRules.companyId", "companyId: input.companyId"]) expect(source).toContain(value); });
  it("reuses official availability and the pure diagnosis", () => { expect(source).toContain("listServiceLedAvailability"); expect(source).toContain("diagnoseSchedulingSpecificTime"); expect(source).toContain("durationOverrideMinutes"); });
  it("does not persist or mutate", () => { for (const value of [".insert(", ".update(", ".delete(", "NextResponse", "fetch("]) expect(source).not.toContain(value); });
});
