import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppointmentJourney: vi.fn(),
  validateInternalRequest: vi.fn(),
  createOperationalUseCaseContext: vi.fn(),
}));

vi.mock("@/platform/capabilities/scheduling", () => ({
  SisagSchedulingAdapter: class {
    getAppointmentJourney = mocks.getAppointmentJourney;
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
const appointmentId = "7bcda384-1bc3-4ea0-922b-8c46df34d183";

function request(body: unknown) {
  return new Request("http://localhost/get-appointment-journey", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST get-appointment-journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
    mocks.createOperationalUseCaseContext.mockReturnValue({
      companyId,
      actor: { type: "system", id: "platform-internal" },
      correlationId: "correlation-1",
      requestedAt: "2026-08-06T12:00:00.000Z",
    });
  });

  it("returns the operational journey", async () => {
    const journey = { booking: { id: appointmentId }, events: [] };
    mocks.getAppointmentJourney.mockResolvedValue({ ok: true, data: journey });

    const response = await POST(request({ companyId, appointmentId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: journey,
      context: { correlationId: "correlation-1" },
    });
    expect(mocks.getAppointmentJourney).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      { appointmentId },
    );
  });

  it("maps a missing appointment to HTTP 404", async () => {
    mocks.getAppointmentJourney.mockResolvedValue({
      ok: false,
      error: { code: "SCHEDULING_APPOINTMENT_NOT_FOUND", message: "Não encontrado" },
    });

    const response = await POST(request({ companyId, appointmentId }));
    expect(response.status).toBe(404);
  });

  it.each([
    [{ appointmentId }, "SCHEDULING_COMPANY_REQUIRED"],
    [{ companyId }, "SCHEDULING_APPOINTMENT_REQUIRED"],
    [{ companyId: "invalid", appointmentId }, "SCHEDULING_INVALID_COMPANY_ID"],
    [{ companyId, appointmentId: "invalid" }, "SCHEDULING_INVALID_APPOINTMENT_ID"],
  ])("rejects invalid identity input", async (body, code) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(mocks.getAppointmentJourney).not.toHaveBeenCalled();
  });

  it("preserves internal authentication failures", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validateInternalRequest.mockReturnValue({ ok: false, response: denied });

    const response = await POST(request({ companyId, appointmentId }));
    expect(response.status).toBe(401);
    expect(mocks.getAppointmentJourney).not.toHaveBeenCalled();
  });
});
