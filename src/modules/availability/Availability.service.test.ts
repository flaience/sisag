import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: mocks.getDb }));

import { AvailabilityService } from "./Availability.service";

function limited(rows: unknown[]) {
  return { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => rows) })) })) };
}

describe("availability service tenant ownership", () => {
  it("rejects a service that does not belong to the requested company", async () => {
    const select = vi.fn()
      .mockReturnValueOnce(limited([{ timezone: "America/Sao_Paulo" }]))
      .mockReturnValueOnce(limited([]));
    mocks.getDb.mockReturnValue({ select });

    const result = await AvailabilityService.listSlots({
      companyId: "23164020-8778-4226-afed-189e8d2333cc",
      serviceId: "53164020-8778-4226-afed-189e8d2333cc",
      startTime: new Date("2026-08-27T12:00:00.000Z"),
    });

    expect(result).toEqual({ ok: false, error: "service_not_found" });
    expect(select).toHaveBeenCalledTimes(2);
  });
});
