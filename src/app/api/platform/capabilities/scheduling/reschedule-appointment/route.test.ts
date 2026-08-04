import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rescheduleAppointment: vi.fn(),
  validateInternalRequest: vi.fn(),
  createOperationalUseCaseContext: vi.fn(),
}));

vi.mock("@/platform/capabilities/scheduling", () => ({
  SisagSchedulingAdapter: class {
    rescheduleAppointment = mocks.rescheduleAppointment;
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
const startsAt = "2026-08-05T15:00:00.000Z";
const endsAt = "2026-08-05T15:30:00.000Z";

function request(body: unknown) {
  return new Request("http://localhost/reschedule-appointment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST reschedule-appointment", () => {
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

  it("rejects an invalid appointmentId", async () => {
    const response = await POST(
      request({ companyId, appointmentId: "invalid", startsAt, endsAt }),
    );
    expect(response.status).toBe(400);
    expect(mocks.rescheduleAppointment).not.toHaveBeenCalled();
  });

  it("forwards the interval and reason", async () => {
    mocks.rescheduleAppointment.mockResolvedValue({
      ok: true,
      data: { id: appointmentId, state: "confirmed", startsAt, endsAt },
      emittedEvents: ["appointment.rescheduled"],
    });

    const response = await POST(
      request({
        companyId,
        appointmentId,
        startsAt,
        endsAt,
        reason: "  Cliente solicitou  ",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.rescheduleAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ companyId }),
      { appointmentId, startsAt, endsAt, reason: "Cliente solicitou" },
    );
  });

  it("maps slot unavailable to HTTP 409", async () => {
    mocks.rescheduleAppointment.mockResolvedValue({
      ok: false,
      error: {
        code: "SCHEDULING_SLOT_NOT_AVAILABLE",
        message: "Horário indisponível.",
      },
    });

    const response = await POST(
      request({ companyId, appointmentId, startsAt, endsAt }),
    );
    expect(response.status).toBe(409);
  });
});
