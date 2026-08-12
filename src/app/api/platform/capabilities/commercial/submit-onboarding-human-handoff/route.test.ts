import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("@/modules/commercial/commercial-onboarding-human-handoff.service", () => ({
  submitCommercialOnboardingHumanHandoff: mocks.submit,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  actor: { id: "2d3a4184-d8f8-4dfa-a694-466d15f950ee", name: "Luis" },
  team: [
    {
      name: "Maria Silva",
      email: "maria@example.com",
      role: "professional",
      phone: "+5554999999999",
    },
  ],
  notes: "Equipe inicial confirmada.",
};

const request = (body: unknown) =>
  new Request("http://localhost/submit-onboarding-human-handoff", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST commercial submit-onboarding-human-handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before submitting", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request(input))).toBe(denied);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("returns the normalized handoff result", async () => {
    mocks.submit.mockResolvedValue({
      ok: true,
      replayed: false,
      onboardingId,
      stepCode: "configure_team",
      nextStepCode: "configure_channels",
      teamSize: 1,
      emittedEvents: ["commercial.onboarding.step_changed"],
    });

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        stepCode: "configure_team",
        nextStepCode: "configure_channels",
        teamSize: 1,
      },
      emittedEvents: ["commercial.onboarding.step_changed"],
    });
    expect(mocks.submit).toHaveBeenCalledWith(input);
  });

  it("preserves an idempotent replay", async () => {
    mocks.submit.mockResolvedValue({
      ok: true,
      replayed: true,
      onboardingId,
      stepCode: "configure_team",
      nextStepCode: "configure_channels",
      teamSize: 1,
      emittedEvents: [],
    });

    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["handoff_not_available", 409, "COMMERCIAL_ONBOARDING_HANDOFF_NOT_AVAILABLE"],
    ["transition_failed", 409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
    ["query_failed", 500, "COMMERCIAL_ONBOARDING_QUERY_FAILED"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.submit.mockResolvedValue({ ok: false, error, message: "Falha controlada." });

    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before submitting", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.submit.mockRejectedValue(new Error("private database credential"));

    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível concluir o handoff humano do onboarding comercial.",
      },
    });
  });
});
