import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiRole: vi.fn(), listBusyResources: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/availability/Availability.service", () => ({
  AvailabilityService: { listBusyResources: mocks.listBusyResources },
}));

import { GET } from "./route";

it("queries busy resources only for the authenticated company", async () => {
  mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "admin" } });
  mocks.listBusyResources.mockResolvedValue([]);
  const response = await GET(new Request(
    "https://sisag.test/api/v1/availability/resources?companyId=tenant-b&start=2026-08-27T12:00:00.000Z&end=2026-08-27T13:00:00.000Z",
  ) as never);
  expect(response.status).toBe(200);
  expect(mocks.listBusyResources).toHaveBeenCalledWith(expect.objectContaining({ companyId: "tenant-a" }));
});
