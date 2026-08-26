import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  createAuto: vi.fn(),
}));

vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/bookings/Booking.service", () => ({
  BookingService: { createAuto: mocks.createAuto },
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => {
    throw new Error("database_must_not_be_reached");
  }),
}));

import { GET, POST } from "./route";

const companyId = "23164020-8778-4226-afed-189e8d2333cc";
const foreignCompanyId = "53164020-8778-4226-afed-189e8d2333cc";

describe("bookings tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects list access without an authenticated tenant", async () => {
    mocks.requireApiRole.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(new Request(
      `https://sisag.test/api/v1/bookings?companyId=${foreignCompanyId}`,
    ) as never);

    expect(response.status).toBe(401);
    expect(mocks.requireApiRole).toHaveBeenCalledOnce();
  });

  it("creates only inside the company resolved from the session", async () => {
    mocks.requireApiRole.mockResolvedValue({
      ok: true,
      auth: {
        userId: "user-1",
        companyId,
        tenantId: null,
        role: "admin",
        name: "Operador",
      },
    });
    mocks.createAuto.mockResolvedValue({
      ok: true,
      booking: { id: "booking-1", companyId },
    });

    const response = await POST(new Request("https://sisag.test/api/v1/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: foreignCompanyId,
        clientId: "client-1",
        professionalId: "professional-1",
        serviceId: "service-1",
        date: "2026-08-27",
        time: "09:30",
      }),
    }) as never);

    expect(response.status).toBe(201);
    expect(mocks.createAuto).toHaveBeenCalledWith(expect.objectContaining({
      companyId,
      clientId: "client-1",
      serviceId: "service-1",
    }));
    expect(mocks.createAuto).not.toHaveBeenCalledWith(expect.objectContaining({
      companyId: foreignCompanyId,
    }));
  });
});
