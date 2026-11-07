import { describe, expect, it, vi } from "vitest";
import { getSchedulingReadinessSpecificTime } from "./SchedulingReadinessSpecificTimeReadModel.service";
const input = { companyId: "company-a", unitId: "unit-a", serviceId: "service-a", professionalId: "professional-a", date: "2026-11-09", time: "15:00" };
const facts = { durationMinutes: 30, timezone: "America/Sao_Paulo", schedules: [{ unitId: input.unitId, weekday: 1, startTime: "13:00", endTime: "18:00" }], assignments: [{ unitId: input.unitId, serviceId: input.serviceId, professionalId: input.professionalId, weekday: 1, startTime: "13:00", endTime: "18:00", active: true }], slots: [] };
describe("scheduling readiness specific time read model", () => {
  it("evaluates only tenant-scoped trusted facts", async () => { const loadFacts = vi.fn().mockResolvedValue(facts); await expect(getSchedulingReadinessSpecificTime(input, { loadFacts })).resolves.toMatchObject({ reason: "unavailable_after_configuration", readOnly: true }); expect(loadFacts).toHaveBeenCalledWith(input); });
  it("does not expose source rows", async () => { const result = await getSchedulingReadinessSpecificTime(input, { loadFacts: async () => facts }); expect(result).not.toHaveProperty("schedules"); expect(result).not.toHaveProperty("assignments"); expect(result).not.toHaveProperty("slots"); });
  it("requires every boundary and a trusted duration", async () => { await expect(getSchedulingReadinessSpecificTime({ ...input, companyId: "" }, { loadFacts: async () => facts })).rejects.toThrow("missing_specific_time_boundary"); await expect(getSchedulingReadinessSpecificTime(input, { loadFacts: async () => ({ ...facts, durationMinutes: null }) })).rejects.toThrow("missing_service_duration"); });
});
