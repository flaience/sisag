import { describe, expect, it } from "vitest";

import { guardCommercialOnboardingCompletion } from "./commercial-onboarding-completion-guard.service";

const codes = [
  "validate_registration", "configure_company", "configure_scheduling", "configure_team",
  "configure_channels", "training", "go_live_validation", "complete_onboarding",
];

const trainingEvidence = [
  "platform_basics", "scheduling_operations", "team_operations", "channels_and_support",
].map((moduleCode) => ({
  moduleCode,
  completedBy: { id: "user-1", name: "Luis" },
  completedAt: "2026-08-12T21:00:00.000Z",
  score: 90,
  acknowledged: true,
  evidence: "Treinamento validado em produção.",
}));

const goLiveEvidence = [
  "company_configuration", "scheduling_configuration", "team_configuration",
  "active_channels", "training_completion", "operational_health",
].map((checkCode) => ({
  checkCode,
  status: "passed",
  checkedAt: "2026-08-12T22:00:00.000Z",
  checkedBy: { type: "system", id: "production-readiness" },
  details: "Verificação validada em produção.",
}));

function validSteps() {
  return codes.map((code, index) => ({
    code,
    position: index + 1,
    status: index === 7 ? "in_progress" as const : "completed" as const,
    input: code === "training"
      ? { trainingContext: { businessType: "generic", activeChannels: ["meta"], teamSize: 1 }, trainingEvidence }
      : code === "go_live_validation" ? { goLiveEvidence } : {},
  }));
}

describe("commercial onboarding completion guard", () => {
  it("allows completion only with the full validated journey", () => {
    expect(guardCommercialOnboardingCompletion(validSteps())).toEqual({ allowed: true });
  });

  it("rejects a missing or reordered step", () => {
    expect(guardCommercialOnboardingCompletion(validSteps().slice(1))).toMatchObject({
      allowed: false, reason: "invalid_step_sequence",
    });
  });

  it("rejects an incomplete previous step", () => {
    const steps = validSteps();
    steps[3]!.status = "in_progress";
    expect(guardCommercialOnboardingCompletion(steps)).toMatchObject({
      allowed: false, reason: "previous_steps_incomplete",
    });
  });

  it("rejects missing training evidence", () => {
    const steps = validSteps();
    steps[5]!.input = { trainingContext: { businessType: "generic", activeChannels: ["meta"], teamSize: 1 }, trainingEvidence: [] };
    expect(guardCommercialOnboardingCompletion(steps)).toMatchObject({
      allowed: false, reason: "training_incomplete",
    });
  });

  it("rejects a failed go-live check", () => {
    const steps = validSteps();
    steps[6]!.input = { goLiveEvidence: goLiveEvidence.map((item, index) => index === 5 ? { ...item, status: "failed" } : item) };
    expect(guardCommercialOnboardingCompletion(steps)).toMatchObject({
      allowed: false, reason: "go_live_incomplete",
    });
  });
});

