import { describe, expect, it } from "vitest";
import { getSchedulingReadiness } from "./SchedulingReadinessReadModel.service";

const input = { companyId: "company-a", unitId: "unit-a", serviceId: "service-a", professionalId: "professional-a" };
const complete = {
  unit: { active: true },
  service: { active: true, durationMinutes: 30 },
  professional: { status: "active" },
  professionalUnit: { active: true },
  professionalService: { active: true, durationOverrideMinutes: null },
  schedules: [{ unitId: "unit-a", weekday: 1, startTime: "08:00", endTime: "12:00" }],
  assignments: [{ unitId: "unit-a", weekday: 1, startTime: "08:00", endTime: "12:00", active: true }],
  activeBlockingExceptions: 0,
};

describe("scheduling readiness read model", () => {
  it("evaluates tenant-scoped facts without exposing source rows", async () => {
    const result = await getSchedulingReadiness(input, { loadFacts: async (received) => { expect(received).toEqual(input); return complete; } });
    expect(result).toMatchObject({ ready: true, readOnly: true, warnings: [] });
    expect(result).not.toHaveProperty("unit");
    expect(result).not.toHaveProperty("professional");
  });

  it("uses a professional duration override and reports missing links", async () => {
    const result = await getSchedulingReadiness(input, { loadFacts: async () => ({ ...complete, professionalUnit: null, professionalService: { active: true, durationOverrideMinutes: 45 } }) });
    expect(result.ready).toBe(false);
    expect(result.checks).toContainEqual({ key: "service_duration", status: "ready" });
    expect(result.checks).toContainEqual({ key: "professional_unit", status: "missing" });
  });

  it("requires every trusted boundary", async () => {
    await expect(getSchedulingReadiness({ ...input, companyId: "" }, { loadFacts: async () => complete })).rejects.toThrow("missing_readiness_boundary");
  });
});
