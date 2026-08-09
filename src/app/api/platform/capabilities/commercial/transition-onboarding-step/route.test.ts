import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transition: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-workflow.service", () => ({ transitionCommercialOnboardingStep: mocks.transition }));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));
import { POST } from "./route";

const input = { onboardingId: "11111111-1111-4111-8111-111111111111", stepCode: "validate_registration", action: "start", actor: { type: "system", id: "onboarding-agent" }, reason: "Início automatizado da etapa" };
const request = (body: unknown) => new Request("http://localhost/transition-onboarding-step", { method: "POST", body: JSON.stringify(body) });

describe("POST commercial transition-onboarding-step", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.validate.mockReturnValue({ ok: true }); });
  it("rejects unauthorized requests before invoking the workflow", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.transition).not.toHaveBeenCalled();
  });
  it.each([false, true])("returns a successful transition (replayed=%s)", async (replayed) => {
    mocks.transition.mockResolvedValue({ ok: true, replayed, onboarding: { id: input.onboardingId, status: "in_progress", currentStepCode: input.stepCode }, step: { code: input.stepCode, status: "in_progress", attempts: 1 }, emittedEvents: replayed ? [] : ["commercial.onboarding.step_changed"] });
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { replayed }, emittedEvents: replayed ? [] : ["commercial.onboarding.step_changed"] });
    expect(mocks.transition).toHaveBeenCalledWith(input);
  });
  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["step_not_found", 404, "COMMERCIAL_ONBOARDING_STEP_NOT_FOUND"],
    ["onboarding_terminal", 409, "COMMERCIAL_ONBOARDING_TERMINAL"],
    ["step_out_of_order", 409, "COMMERCIAL_ONBOARDING_STEP_OUT_OF_ORDER"],
    ["transition_not_allowed", 409, "COMMERCIAL_ONBOARDING_TRANSITION_NOT_ALLOWED"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.transition.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
  });
  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.transition).not.toHaveBeenCalled();
  });
  it("hides unexpected errors", async () => {
    mocks.transition.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "COMMERCIAL_UNKNOWN_ERROR" } });
  });
});
