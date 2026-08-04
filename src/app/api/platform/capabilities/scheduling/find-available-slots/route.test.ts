import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAvailableSlots: vi.fn(),
  validateInternalRequest: vi.fn(),
  createOperationalUseCaseContext: vi.fn(),
}));

vi.mock("@/platform/capabilities/scheduling", () => ({
  SisagSchedulingAdapter: class {
    findAvailableSlots = mocks.findAvailableSlots;
  },
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validateInternalRequest,
}));
vi.mock("@/platform/core/use-cases", () => ({
  createOperationalUseCaseContext: mocks.createOperationalUseCaseContext,
}));

import { POST } from "./route";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const serviceId = "5233d357-2c37-4d88-b943-c27c76fc5942";
const dateFrom = "2026-08-05T00:00:00.000Z";
const dateTo = "2026-08-06T00:00:00.000Z";

function request(body: unknown) {
  return new Request("http://localhost/find-available-slots", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST find-available-slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
    mocks.createOperationalUseCaseContext.mockReturnValue({
      companyId,
      actor: { type: "system", id: "platform-internal" },
      correlationId: "correlation-1",
      requestedAt: "2026-08-04T12:00:00.000Z",
    });
  });

  it("forwards limit and stepMinutes to the scheduling operation", async () => {
    mocks.findAvailableSlots.mockResolvedValue({
      ok: true,
      data: [],
      emittedEvents: ["availability.generated"],
    });

    const response = await POST(
      request({
        companyId,
        serviceId,
        dateFrom,
        dateTo,
        limit: 10,
        stepMinutes: 30,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.findAvailableSlots).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      expect.objectContaining({
        serviceId,
        dateFrom,
        dateTo,
        limit: 10,
        stepMinutes: 30,
      }),
    );
  });

  it.each([0, -1, 1.5, 2_001])("rejects invalid limit %s", async (limit) => {
    const response = await POST(
      request({ companyId, serviceId, dateFrom, dateTo, limit }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SCHEDULING_INVALID_LIMIT" },
    });
    expect(mocks.findAvailableSlots).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 1_441])(
    "rejects invalid stepMinutes %s",
    async (stepMinutes) => {
      const response = await POST(
        request({ companyId, serviceId, dateFrom, dateTo, stepMinutes }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "SCHEDULING_INVALID_STEP_MINUTES" },
      });
      expect(mocks.findAvailableSlots).not.toHaveBeenCalled();
    },
  );
});
