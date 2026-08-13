import { describe, expect, it, vi } from "vitest";

import { completeCommercialOnboarding } from "./commercial-onboarding-completion.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  actor: { type: "system" as const, id: "completion-agent" },
  reason: "Conclusão segura do onboarding comercial",
  result: { outcome: "activated" },
};

function queryResult(status: "in_progress" | "completed", stepStatus: "pending" | "in_progress" | "completed") {
  return {
    ok: true as const,
    data: {
      onboarding: { status, currentStepCode: status === "completed" ? null : "complete_onboarding" },
      client: { status: status === "completed" ? "active" : "onboarding" },
      steps: [{ code: "complete_onboarding", status: stepStatus }],
    },
  } as never;
}

describe("commercial onboarding completion", () => {
  it("replays an already completed onboarding without transitions", async () => {
    const query = vi.fn().mockResolvedValue(queryResult("completed", "completed"));
    const transition = vi.fn();
    await expect(completeCommercialOnboarding(input, { query, transition })).resolves.toEqual({
      ok: true, replayed: true, onboardingId, status: "completed",
      clientStatus: "active", emittedEvents: [],
    });
    expect(transition).not.toHaveBeenCalled();
  });

  it("starts a pending final step and then completes it", async () => {
    const query = vi.fn().mockResolvedValue(queryResult("in_progress", "pending"));
    const transition = vi.fn()
      .mockResolvedValueOnce({ ok: true, replayed: false, emittedEvents: ["commercial.onboarding.step_changed"] })
      .mockResolvedValueOnce({ ok: true, replayed: false, emittedEvents: ["commercial.onboarding.completed"] });
    await expect(completeCommercialOnboarding(input, { query, transition })).resolves.toMatchObject({
      ok: true, replayed: false, status: "completed", clientStatus: "active",
      emittedEvents: ["commercial.onboarding.step_changed", "commercial.onboarding.completed"],
    });
    expect(transition).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "complete", result: input.result,
    }));
  });

  it("completes an already started final step", async () => {
    const query = vi.fn().mockResolvedValue(queryResult("in_progress", "in_progress"));
    const transition = vi.fn().mockResolvedValue({
      ok: true, replayed: false, emittedEvents: ["commercial.onboarding.completed"],
    });
    await completeCommercialOnboarding(input, { query, transition });
    expect(transition).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({ action: "complete" }));
  });

  it("preserves completion guard failures", async () => {
    const query = vi.fn().mockResolvedValue(queryResult("in_progress", "in_progress"));
    const transition = vi.fn().mockResolvedValue({
      ok: false, error: "completion_requirements_not_met", message: "Checklist incompleto.",
    });
    await expect(completeCommercialOnboarding(input, { query, transition })).resolves.toEqual({
      ok: false, error: "completion_requirements_not_met", message: "Checklist incompleto.",
    });
  });

  it("rejects an onboarding outside the final step", async () => {
    const current = queryResult("in_progress", "pending") as any;
    current.data.onboarding.currentStepCode = "training";
    await expect(completeCommercialOnboarding(input, {
      query: vi.fn().mockResolvedValue(current), transition: vi.fn(),
    })).resolves.toMatchObject({ ok: false, error: "completion_not_available" });
  });

  it("maps missing onboarding and validation errors", async () => {
    await expect(completeCommercialOnboarding(input, {
      query: vi.fn().mockResolvedValue({ ok: false, error: "onboarding_not_found", message: "Ausente." }),
    })).resolves.toEqual({ ok: false, error: "onboarding_not_found", message: "Ausente." });
    await expect(completeCommercialOnboarding({ ...input, reason: "x" })).resolves.toMatchObject({
      ok: false, error: "invalid_input",
    });
  });
});

