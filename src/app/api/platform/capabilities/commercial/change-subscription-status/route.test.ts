import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  changeSubscriptionStatus: vi.fn(),
  validateInternalRequest: vi.fn(),
}));

vi.mock(
  "@/modules/commercial/commercial-subscription-lifecycle.service",
  () => ({ changeSubscriptionStatus: mocks.changeSubscriptionStatus }),
);
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validateInternalRequest,
}));

import { POST } from "./route";

const body = {
  subscriptionId: "67abb33b-b2e9-493e-b70f-0314faabf3dc",
  targetStatus: "active",
  actor: {
    type: "user",
    id: "2d3a4184-d8f8-4dfa-a694-466d15f950ee",
  },
  reason: "Ativação comercial aprovada",
};

function request(payload: unknown) {
  return new Request("http://localhost/change-subscription-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST commercial change-subscription-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
  });

  it("returns the authentication response before reading the operation", async () => {
    const denied = Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
    mocks.validateInternalRequest.mockReturnValue({
      ok: false,
      response: denied,
    });

    const response = await POST(request(body));

    expect(response).toBe(denied);
    expect(mocks.changeSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("changes the subscription and exposes the audited event", async () => {
    mocks.changeSubscriptionStatus.mockResolvedValue({
      ok: true,
      replayed: false,
      subscription: {
        id: body.subscriptionId,
        tenantId: "7e91fac1-b570-425f-af16-300cdf5e4684",
        previousStatus: "trial",
        status: "active",
        provisioningStatus: "completed",
        activatedAt: new Date("2026-08-09T12:00:00.000Z"),
        suspendedAt: null,
        cancelledAt: null,
      },
      emittedEvents: ["commercial.subscription.status_changed"],
    });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        replayed: false,
        subscription: {
          previousStatus: "trial",
          status: "active",
        },
      },
      emittedEvents: ["commercial.subscription.status_changed"],
    });
    expect(mocks.changeSubscriptionStatus).toHaveBeenCalledWith(body);
  });

  it("returns an idempotent replay without an event", async () => {
    mocks.changeSubscriptionStatus.mockResolvedValue({
      ok: true,
      replayed: true,
      subscription: {
        id: body.subscriptionId,
        tenantId: "7e91fac1-b570-425f-af16-300cdf5e4684",
        previousStatus: "active",
        status: "active",
        provisioningStatus: "completed",
        activatedAt: new Date("2026-08-09T12:00:00.000Z"),
        suspendedAt: null,
        cancelledAt: null,
      },
      emittedEvents: [],
    });

    const response = await POST(request(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["subscription_not_found", 404, "COMMERCIAL_SUBSCRIPTION_NOT_FOUND"],
    ["invalid_transition", 409, "COMMERCIAL_INVALID_TRANSITION"],
    ["provisioning_incomplete", 409, "COMMERCIAL_PROVISIONING_INCOMPLETE"],
    ["concurrent_change", 409, "COMMERCIAL_CONCURRENT_CHANGE"],
  ] as const)("maps %s to HTTP %s", async (error, status, code) => {
    mocks.changeSubscriptionStatus.mockResolvedValue({
      ok: false,
      error,
      message: "Falha controlada.",
    });

    const response = await POST(request(body));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before invoking the lifecycle service", async () => {
    const malformed = new Request(
      "http://localhost/change-subscription-status",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );

    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.changeSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.changeSubscriptionStatus.mockRejectedValue(
      new Error("database credential should stay private"),
    );

    const response = await POST(request(body));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível alterar a assinatura comercial.",
      },
    });
  });
});
