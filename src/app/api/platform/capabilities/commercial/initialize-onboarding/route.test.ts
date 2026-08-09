import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ initialize: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding.service", () => ({ initializeCommercialOnboarding: mocks.initialize }));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));
import { POST } from "./route";

const input = { commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc", actor: { type: "system", id: "onboarding-agent" }, reason: "Início automatizado do onboarding" };
const request = (body: unknown) => new Request("http://localhost/initialize-onboarding", { method: "POST", body: JSON.stringify(body) });

describe("POST commercial initialize-onboarding", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.validate.mockReturnValue({ ok: true }); });
  it("rejects unauthorized requests before invoking the service", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it.each([[false, 201], [true, 200]] as const)("returns the initialization result (replayed=%s)", async (replayed, status) => {
    mocks.initialize.mockResolvedValue({ ok: true, replayed, reconciledSteps: replayed ? 0 : 8, onboarding: { id: "onboarding-1", status: "pending" }, emittedEvents: replayed ? [] : ["commercial.onboarding.created"] });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { replayed }, emittedEvents: replayed ? [] : ["commercial.onboarding.created"] });
    expect(mocks.initialize).toHaveBeenCalledWith(input);
  });
  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["commercial_client_not_found", 404, "COMMERCIAL_CLIENT_NOT_FOUND"],
    ["commercial_client_not_eligible", 409, "COMMERCIAL_CLIENT_NOT_ELIGIBLE"],
    ["initialization_conflict", 409, "COMMERCIAL_ONBOARDING_CONFLICT"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.initialize.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
  });
  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.initialize).not.toHaveBeenCalled();
  });
  it("hides unexpected errors", async () => {
    mocks.initialize.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "COMMERCIAL_UNKNOWN_ERROR" } });
  });
});
