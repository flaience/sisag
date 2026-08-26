import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiRole: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/appointments/Appointment.service", () => ({
  AppointmentService: { list: mocks.list, create: mocks.create },
}));

import { GET, POST } from "./route";

describe("appointments tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated listing", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: false, response: Response.json({}, { status: 401 }) });
    const response = await GET(new Request("https://sisag.test/api/v1/appointments?companyId=foreign") as never);
    expect(response.status).toBe(401);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("creates with the company resolved from the session", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "admin" } });
    mocks.create.mockResolvedValue({ ok: true, appointment: { id: "a1" } });
    const response = await POST(new Request("https://sisag.test/api/v1/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId: "tenant-b", professionalId: "p1", clientId: "c1", scheduledTime: "2026-08-27T12:00:00.000Z" }),
    }) as never);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ companyId: "tenant-a" }));
  });
});
