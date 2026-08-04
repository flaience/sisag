import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelAppointment: vi.fn(),
  validateInternalRequest: vi.fn(),
  createOperationalUseCaseContext: vi.fn(),
}));

vi.mock("@/platform/capabilities/scheduling", () => ({
  SisagSchedulingAdapter: class {
    cancelAppointment = mocks.cancelAppointment;
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
const appointmentId = "7c2b319b-80e7-425f-8f1a-e09e69adbc6a";

function request(body: unknown) {
  return new Request("http://localhost/cancel-appointment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST cancel-appointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
    mocks.createOperationalUseCaseContext.mockReturnValue({
      companyId,
      actor: { type: "system", id: "platform-internal" },
      correlationId: "correlation-1",
      requestedAt: "2026-08-03T16:00:00.000Z",
    });
  });

  it("rejects an invalid appointmentId before calling the adapter", async () => {
    const response = await POST(
      request({ companyId, appointmentId: "invalid-id" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "SCHEDULING_INVALID_APPOINTMENT_ID" },
    });
    expect(mocks.cancelAppointment).not.toHaveBeenCalled();
  });

  it("forwards reason and returns the cancelled appointment", async () => {
    mocks.cancelAppointment.mockResolvedValue({
      ok: true,
      data: { id: appointmentId, companyId, state: "cancelled" },
      emittedEvents: ["appointment.cancelled"],
    });

    const response = await POST(
      request({ companyId, appointmentId, reason: "  Cliente solicitou  " }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { id: appointmentId, state: "cancelled" },
      emittedEvents: ["appointment.cancelled"],
    });
    expect(mocks.cancelAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      { appointmentId, reason: "Cliente solicitou" },
    );
  });

  it("maps appointment not found to HTTP 404", async () => {
    mocks.cancelAppointment.mockResolvedValue({
      ok: false,
      error: {
        code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
        message: "Agendamento não encontrado.",
      },
    });

    const response = await POST(request({ companyId, appointmentId }));
    expect(response.status).toBe(404);
  });
});
