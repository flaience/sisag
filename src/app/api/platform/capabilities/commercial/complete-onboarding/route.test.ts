import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ complete: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-completion.service", () => ({
  completeCommercialOnboarding: mocks.complete,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const input = {
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  actor: { type: "system", id: "completion-agent" },
  reason: "Conclusão segura do onboarding comercial",
};
const request = (body: unknown) => new Request("http://localhost/complete-onboarding", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("POST commercial complete-onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("authenticates before completing", async () => {
    const denied = Response.json({ ok: false }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it.each([false, true])("returns a successful completion (replayed=%s)", async (replayed) => {
    mocks.complete.mockResolvedValue({
      ok: true, replayed, onboardingId: input.onboardingId, status: "completed",
      clientStatus: "active", emittedEvents: replayed ? [] : ["commercial.onboarding.completed"],
    });
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed, status: "completed", clientStatus: "active" },
    });
    expect(mocks.complete).toHaveBeenCalledWith(input);
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["completion_not_available", 409, "COMMERCIAL_ONBOARDING_COMPLETION_NOT_AVAILABLE"],
    ["completion_requirements_not_met", 409, "COMMERCIAL_ONBOARDING_COMPLETION_REQUIREMENTS_NOT_MET"],
    ["transition_failed", 409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
    ["query_failed", 500, "COMMERCIAL_ONBOARDING_QUERY_FAILED"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.complete.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false, error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.complete.mockRejectedValue(new Error("private completion detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "COMMERCIAL_UNKNOWN_ERROR", message: "Não foi possível concluir o onboarding comercial." },
    });
  });
});

