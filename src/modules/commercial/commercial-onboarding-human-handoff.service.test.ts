import { describe, expect, it, vi } from "vitest";

import { submitCommercialOnboardingHumanHandoff } from "./commercial-onboarding-human-handoff.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const clientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const actorId = "2d3a4184-d8f8-4dfa-a694-466d15f950ee";

function queryResult(status: "pending" | "in_progress" | "completed" = "pending") {
  const teamStep = {
    id: "step-team",
    code: "configure_team",
    position: 4,
    title: "Cadastro da equipe",
    status,
    executorType: "human" as const,
    executorId: status === "completed" ? actorId : null,
    attempts: status === "pending" ? 0 : 1,
    lastError: null,
    input: null,
    result: status === "completed" ? { teamSize: 1 } : null,
    startedAt: status === "pending" ? null : new Date("2026-08-12T10:00:00Z"),
    completedAt: status === "completed" ? new Date("2026-08-12T10:01:00Z") : null,
    updatedAt: new Date("2026-08-12T10:01:00Z"),
    isCurrent: status !== "completed",
    availableActions: status === "pending" ? ["start"] : status === "in_progress" ? ["complete"] : [],
  };
  return {
    ok: true as const,
    data: {
      onboarding: {
        id: onboardingId, commercialClientId: clientId, status: "in_progress" as const,
        currentStepCode: status === "completed" ? "configure_channels" : "configure_team",
        blockedReason: null, input: null, result: null, startedAt: new Date(), completedAt: null,
        cancelledAt: null, createdAt: new Date(), updatedAt: new Date(),
      },
      client: { id: clientId, legalName: "Company Demo", tradeName: "Company Demo", status: "onboarding" as const },
      progress: { total: 8, completed: status === "completed" ? 4 : 3, pending: status === "completed" ? 4 : 5, percentage: status === "completed" ? 50 : 38 },
      currentStep: status === "completed" ? null : teamStep,
      steps: [teamStep],
    },
  };
}

const input = {
  onboardingId,
  actor: { id: actorId, name: "Luis" },
  team: [
    { name: "Maria Silva", email: "maria@example.com", role: "professional" as const },
  ],
};

describe("commercial onboarding human handoff", () => {
  it("starts and completes a pending human team step", async () => {
    const query = vi.fn().mockResolvedValue(queryResult("pending"));
    const transition = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, replayed: false, emittedEvents: ["commercial.onboarding.step_changed"] })
      .mockResolvedValueOnce({
        ok: true, replayed: false,
        onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_channels" },
        step: { code: "configure_team", status: "completed", attempts: 1 },
        emittedEvents: ["commercial.onboarding.step_changed"],
      });

    const result = await submitCommercialOnboardingHumanHandoff(input, { query, transition });

    expect(result).toMatchObject({ ok: true, replayed: false, nextStepCode: "configure_channels", teamSize: 1 });
    expect(transition).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: "start", stepCode: "configure_team", actor: { type: "human", id: actorId } }));
    expect(transition).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "complete",
      result: expect.objectContaining({ teamSize: 1, submittedBy: { id: actorId, name: "Luis" } }),
    }));
  });

  it("completes an already started handoff without starting it again", async () => {
    const transition = vi.fn().mockResolvedValue({
      ok: true, replayed: false,
      onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_channels" },
      step: { code: "configure_team", status: "completed", attempts: 1 }, emittedEvents: [],
    });
    const result = await submitCommercialOnboardingHumanHandoff(input, {
      query: vi.fn().mockResolvedValue(queryResult("in_progress")), transition,
    });
    expect(result.ok).toBe(true);
    expect(transition).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({ action: "complete" }));
  });

  it("replays a previously completed team handoff", async () => {
    const transition = vi.fn();
    await expect(submitCommercialOnboardingHumanHandoff(input, {
      query: vi.fn().mockResolvedValue(queryResult("completed")), transition,
    })).resolves.toMatchObject({ ok: true, replayed: true, nextStepCode: "configure_channels" });
    expect(transition).not.toHaveBeenCalled();
  });

  it("rejects invalid or duplicate team members", async () => {
    const result = await submitCommercialOnboardingHumanHandoff({
      ...input,
      team: [
        { name: "Maria", email: "maria@example.com", role: "professional" },
        { name: "Outra Maria", email: "MARIA@example.com", role: "admin" },
      ],
    });
    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("refuses to bypass a different or automatic step", async () => {
    const state = queryResult("pending");
    state.data.currentStep = { ...state.data.currentStep!, code: "configure_channels", executorType: "agent" };
    await expect(submitCommercialOnboardingHumanHandoff(input, {
      query: vi.fn().mockResolvedValue(state), transition: vi.fn(),
    })).resolves.toMatchObject({ ok: false, error: "handoff_not_available" });
  });

  it("propagates a rejected transition without completing the step", async () => {
    const transition = vi.fn().mockResolvedValue({ ok: false, error: "step_out_of_order", message: "Etapa fora de ordem." });
    const result = await submitCommercialOnboardingHumanHandoff(input, {
      query: vi.fn().mockResolvedValue(queryResult("pending")), transition,
    });
    expect(result).toMatchObject({ ok: false, error: "transition_failed" });
    expect(transition).toHaveBeenCalledTimes(1);
  });
});
