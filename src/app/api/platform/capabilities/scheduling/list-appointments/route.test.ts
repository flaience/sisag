import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAppointments: vi.fn(),
  validateInternalRequest: vi.fn(),
  createOperationalUseCaseContext: vi.fn(),
}));

vi.mock("@/platform/capabilities/scheduling", () => ({
  SisagSchedulingAdapter: class {
    listAppointments = mocks.listAppointments;
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
const clientId = "fc1e2986-3a49-444f-b0cd-769eed3ef405";

function request(body: unknown) {
  return new Request("http://localhost/list-appointments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST list-appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
    mocks.createOperationalUseCaseContext.mockReturnValue({
      companyId,
      actor: { type: "system", id: "platform-internal" },
      correlationId: "correlation-1",
      requestedAt: "2026-08-05T12:00:00.000Z",
    });
  });

  it("forwards filters and pagination", async () => {
    mocks.listAppointments.mockResolvedValue({ ok: true, data: [] });
    const response = await POST(request({
      companyId,
      clientId,
      state: "confirmed",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
      limit: 25,
      offset: 50,
    }));

    expect(response.status).toBe(200);
    expect(mocks.listAppointments).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      expect.objectContaining({ clientId, state: "confirmed", limit: 25, offset: 50 }),
    );
  });

  it.each([0, 101, 1.5])("rejects invalid limit %s", async (limit) => {
    const response = await POST(request({ companyId, limit }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SCHEDULING_INVALID_LIMIT" },
    });
  });

  it("rejects an invalid interval", async () => {
    const response = await POST(request({
      companyId,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z",
    }));
    expect(response.status).toBe(400);
    expect(mocks.listAppointments).not.toHaveBeenCalled();
  });

  it("preserves internal authentication failures", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validateInternalRequest.mockReturnValue({ ok: false, response: denied });
    const response = await POST(request({ companyId }));
    expect(response.status).toBe(401);
    expect(mocks.listAppointments).not.toHaveBeenCalled();
  });
});
