import { describe, expect, it, vi } from "vitest";
import { createServiceArrivalPeriod, deactivateServiceArrivalPeriod, listServiceArrivalPeriods, updateServiceArrivalPeriod } from "./ServiceArrivalPeriod.service";

const input = { unitId: "11111111-1111-4111-8111-111111111111", serviceId: "22222222-2222-4222-8222-222222222222", weekday: 1, startTime: "08:00", endTime: "12:00", capacity: 30, active: true };

describe("service arrival period boundary", () => {
  it("forwards the authenticated company to every operation", async () => {
    const list = vi.fn().mockResolvedValue([]);
    const create = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({});
    const deactivate = vi.fn().mockResolvedValue({});
    await listServiceArrivalPeriods("company-a", { status: "active" }, { list });
    await createServiceArrivalPeriod("company-a", input, { create });
    await updateServiceArrivalPeriod("company-a", "period-a", input, { update });
    await deactivateServiceArrivalPeriod("company-a", "period-a", { deactivate });
    expect(list).toHaveBeenCalledWith("company-a", { status: "active" });
    expect(create).toHaveBeenCalledWith("company-a", input);
    expect(update).toHaveBeenCalledWith("company-a", "period-a", input);
    expect(deactivate).toHaveBeenCalledWith("company-a", "period-a");
  });

  it("rejects a missing company boundary", async () => {
    await expect(listServiceArrivalPeriods(" ", { status: "active" }, { list: vi.fn() })).rejects.toThrow("missing_company_id");
  });
});
