import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/availability/Availability.service.ts", "utf8");

describe("professional status normalization in availability", () => {
  it("accepts the canonical uppercase active status while remaining case tolerant", () => {
    expect(service).toContain("upper(coalesce(");
    expect(service).toContain("= 'ACTIVE'");
    expect(service).not.toContain('eq(professionals.status, "active")');
  });
  it("keeps the trusted tenant and candidate resource boundaries", () => {
    expect(service).toContain("eq(professionalSchedules.companyId, input.companyId)");
    expect(service).toContain("inArray(professionals.resourceId, candidateIds)");
  });
});
