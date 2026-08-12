import { describe, expect, it } from "vitest";

import {
  buildCommercialOnboardingTrainingPlan,
  evaluateCommercialOnboardingTraining,
} from "./commercial-onboarding-training.service";

const plan = buildCommercialOnboardingTrainingPlan({
  businessType: "clinic",
  activeChannels: ["Meta", "meta"],
  teamSize: 3,
})!;

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    moduleCode: "platform_basics" as const,
    completedBy: { id: "user-1", name: "Luis" },
    completedAt: "2026-08-12T18:00:00.000Z",
    score: 90,
    acknowledged: true as const,
    evidence: "Simulação assistida concluída.",
    ...overrides,
  };
}

describe("commercial onboarding training", () => {
  it("builds a versioned contextual training plan", () => {
    expect(plan).toMatchObject({
      version: "2026-08-v1",
      context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 3 },
      totalEstimatedMinutes: 75,
    });
    expect(plan.modules).toHaveLength(4);
    expect(plan.modules.every((module) => module.required)).toBe(true);
  });

  it("rejects an invalid context", () => {
    expect(
      buildCommercialOnboardingTrainingPlan({
        businessType: "",
        activeChannels: [],
        teamSize: 0,
      }),
    ).toBeNull();
  });

  it("reports every missing mandatory module", () => {
    expect(evaluateCommercialOnboardingTraining(plan, [])).toEqual({
      ready: false,
      error: "training_incomplete",
      missingModules: [
        "platform_basics",
        "scheduling_operations",
        "team_operations",
        "channels_and_support",
      ],
    });
  });

  it("does not accept evidence below the module score", () => {
    const result = evaluateCommercialOnboardingTraining(plan, [
      evidence({ score: 60 }),
    ]);
    expect(result).toMatchObject({
      ready: false,
      error: "training_incomplete",
      missingModules: expect.arrayContaining(["platform_basics"]),
    });
  });

  it("rejects malformed or unacknowledged evidence", () => {
    const result = evaluateCommercialOnboardingTraining(plan, [
      evidence({ acknowledged: false }),
    ]);
    expect(result).toMatchObject({ ready: false, error: "invalid_evidence" });
  });

  it("authorizes completion only with valid evidence for every module", () => {
    const result = evaluateCommercialOnboardingTraining(plan, [
      evidence(),
      evidence({ moduleCode: "scheduling_operations", score: 85 }),
      evidence({ moduleCode: "team_operations" }),
      evidence({
        moduleCode: "channels_and_support",
        completedAt: "2026-08-12T18:30:00.000Z",
      }),
    ]);

    expect(result).toMatchObject({
      ready: true,
      result: {
        planVersion: "2026-08-v1",
        completedModules: [
          "platform_basics",
          "scheduling_operations",
          "team_operations",
          "channels_and_support",
        ],
        completedAt: "2026-08-12T18:30:00.000Z",
      },
    });
  });
});
