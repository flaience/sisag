import { describe, expect, it, vi } from "vitest";
import { listN8nAgentArrivalOrderPeriods } from "./N8nAgentArrivalOrderReadModel.service";

const periods = [
  { id: "morning", serviceName: "Consulta Ocupacional", unitName: "Matriz", startTime: "08:00", endTime: "12:00", capacity: 30, registered: 28 },
  { id: "full", serviceName: "Consulta Ocupacional", unitName: "Matriz", startTime: "13:00", endTime: "17:00", capacity: 1, registered: 1 },
  { id: "exam", serviceName: "Exame", unitName: "Matriz", startTime: "14:00", endTime: "18:00", capacity: null, registered: 40 },
];

describe("n8n agent arrival order read model", () => {
  it("scopes the trusted load by company date and weekday", async () => {
    const load = vi.fn().mockResolvedValue(periods);
    const result = await listN8nAgentArrivalOrderPeriods({ companyId: "company-a", attendanceDate: "2026-11-23", dayPeriod: "morning", serviceText: "consulta ocupacional" }, load);
    expect(load).toHaveBeenCalledWith("company-a", "2026-11-23", 1);
    expect(result.periods).toEqual([{ serviceName: "Consulta Ocupacional", unitName: "Matriz", startTime: "08:00", endTime: "12:00", capacity: 30, registered: 28 }]);
  });
  it("filters exhausted periods and bounds the result", async () => {
    const result = await listN8nAgentArrivalOrderPeriods({ companyId: "company-a", attendanceDate: "2026-11-23", dayPeriod: null, serviceText: null }, async () => [...periods, ...periods, ...periods]);
    expect(result.periods).toHaveLength(5);
    expect(result.periods.every(item => item.capacity === null || item.registered < item.capacity)).toBe(true);
  });
  it("fails closed without company or a valid date", async () => {
    await expect(listN8nAgentArrivalOrderPeriods({ companyId: " ", attendanceDate: "2026-11-23", dayPeriod: null, serviceText: null }, vi.fn())).rejects.toThrow("missing_company_id");
    await expect(listN8nAgentArrivalOrderPeriods({ companyId: "company-a", attendanceDate: "23/11/2026", dayPeriod: null, serviceText: null }, vi.fn())).rejects.toThrow("invalid_attendance_date");
  });
});
