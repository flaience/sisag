import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  provisionCommercialAccount: vi.fn(),
  validateInternalRequest: vi.fn(),
}));

vi.mock("@/modules/commercial/commercial-provisioning.service", () => ({
  provisionCommercialAccount: mocks.provisionCommercialAccount,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validateInternalRequest,
}));

import { POST } from "./route";

const input = {
  tenantId: "7e91fac1-b570-425f-af16-300cdf5e4684",
  ownerUserId: "2d3a4184-d8f8-4dfa-a694-466d15f950ee",
  legalName: "Clínica Exemplo LTDA",
  tradeName: "Clínica Exemplo",
  documentNumber: "12345678000190",
  email: "contato@exemplo.com",
};

function request(body: unknown) {
  return new Request("http://localhost/provision-account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial provision-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateInternalRequest.mockReturnValue({ ok: true });
  });

  it("returns the authentication response without invoking provisioning", async () => {
    const denied = Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
    mocks.validateInternalRequest.mockReturnValue({
      ok: false,
      response: denied,
    });

    const response = await POST(request(input));

    expect(response).toBe(denied);
    expect(mocks.provisionCommercialAccount).not.toHaveBeenCalled();
  });

  it("creates a commercial account and returns HTTP 201", async () => {
    mocks.provisionCommercialAccount.mockResolvedValue({
      ok: true,
      replayed: false,
      client: { id: "client-1", status: "onboarding" },
      subscription: {
        id: "subscription-1",
        tenantId: input.tenantId,
        planCode: "standard",
        status: "trial",
        provisioningStatus: "completed",
      },
      owner: { userId: input.ownerUserId, role: "owner", isActive: true },
      emittedEvents: ["commercial.account.provisioned"],
    });

    const response = await POST(request(input));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        replayed: false,
        subscription: { status: "trial" },
      },
      emittedEvents: ["commercial.account.provisioned"],
    });
    expect(mocks.provisionCommercialAccount).toHaveBeenCalledWith(input);
  });

  it("returns HTTP 200 for an idempotent replay", async () => {
    mocks.provisionCommercialAccount.mockResolvedValue({
      ok: true,
      replayed: true,
      client: { id: "client-1", status: "onboarding" },
      subscription: {
        id: "subscription-1",
        tenantId: input.tenantId,
        planCode: "standard",
        status: "trial",
        provisioningStatus: "completed",
      },
      owner: { userId: input.ownerUserId, role: "owner", isActive: true },
      emittedEvents: [],
    });

    const response = await POST(request(input));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["tenant_not_found", 404, "COMMERCIAL_TENANT_NOT_FOUND"],
    ["commercial_conflict", 409, "COMMERCIAL_PROVISIONING_CONFLICT"],
  ] as const)("maps %s to HTTP %s", async (error, status, code) => {
    mocks.provisionCommercialAccount.mockResolvedValue({
      ok: false,
      error,
      message: "Falha controlada.",
    });

    const response = await POST(request(input));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before invoking provisioning", async () => {
    const malformed = new Request("http://localhost/provision-account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.provisionCommercialAccount).not.toHaveBeenCalled();
  });

  it("does not expose unexpected provisioning errors", async () => {
    mocks.provisionCommercialAccount.mockRejectedValue(
      new Error("database credential should stay private"),
    );

    const response = await POST(request(input));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível provisionar a conta comercial.",
      },
    });
  });
});
