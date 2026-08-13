import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ process: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-post-activation-milestone-processing.service", () => ({
  processCommercialPostActivationMilestone: mocks.process,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  observations: {
    welcome_delivered: true,
    support_channel_confirmed: true,
  },
};

const request = (body: unknown) => new Request("http://localhost/post-activation-milestone", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const success = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  replayed: false,
  decision: "completed",
  onboardingId,
  milestoneCode: "welcome",
  missingIndicators: [],
  activeEscalations: [],
  emittedEvents: ["commercial.post_activation.milestone_completed"],
  ...overrides,
});

describe("POST commercial process-post-activation-milestone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before processing", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request(input))).toBe(denied);
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("returns a completed milestone and emitted event", async () => {
    mocks.process.mockResolvedValue(success());

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        decision: "completed",
        onboardingId,
        milestoneCode: "welcome",
        missingIndicators: [],
        activeEscalations: [],
      },
      emittedEvents: ["commercial.post_activation.milestone_completed"],
    });
    expect(mocks.process).toHaveBeenCalledWith(input);
  });

  it("returns wait without an event", async () => {
    mocks.process.mockResolvedValue(success({
      decision: "wait",
      missingIndicators: ["support_channel_confirmed"],
      emittedEvents: [],
    }));

    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      data: {
        decision: "wait",
        missingIndicators: ["support_channel_confirmed"],
      },
      emittedEvents: [],
    });
  });

  it("returns human escalation details", async () => {
    mocks.process.mockResolvedValue(success({
      decision: "human_escalation",
      activeEscalations: ["welcome_delivery_failed"],
      emittedEvents: ["commercial.post_activation.human_escalation_requested"],
    }));

    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      data: {
        decision: "human_escalation",
        activeEscalations: ["welcome_delivery_failed"],
      },
      emittedEvents: ["commercial.post_activation.human_escalation_requested"],
    });
  });

  it("preserves plan-completed replay", async () => {
    mocks.process.mockResolvedValue(success({
      replayed: true,
      decision: "plan_completed",
      milestoneCode: null,
      emittedEvents: [],
    }));

    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      data: { replayed: true, decision: "plan_completed", milestoneCode: null },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["follow_up_not_scheduled", 409, "COMMERCIAL_POST_ACTIVATION_NOT_SCHEDULED"],
    ["invalid_follow_up_state", 409, "COMMERCIAL_POST_ACTIVATION_INVALID_STATE"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.process.mockResolvedValue({ ok: false, error, message: "Falha controlada." });

    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before processing", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.process).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.process.mockRejectedValue(new Error("private milestone database detail"));

    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível processar o marco pós-ativação.",
      },
    });
  });
});
