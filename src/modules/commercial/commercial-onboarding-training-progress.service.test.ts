import { describe, expect, it, vi } from "vitest";

import { recordCommercialOnboardingTrainingProgress } from "./commercial-onboarding-training-progress.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const context = { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 };
const evidence = {
  moduleCode: "platform_basics" as const,
  completedBy: { id: "user-1", name: "Luis" },
  completedAt: "2026-08-12T18:00:00.000Z",
  score: 90,
  acknowledged: true as const,
  evidence: "Simulação assistida concluída.",
};

function setup(
  savedEvidence: object[] = [],
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled" = "pending",
) {
  const tx = {
    findTraining: vi.fn().mockResolvedValue({
      id: "training-step",
      status,
      input: { trainingEvidence: savedEvidence },
    }),
    saveProgress: vi.fn().mockResolvedValue(undefined),
  };
  const store = { transaction: vi.fn((callback) => callback(tx)) };
  return { tx, store };
}

describe("commercial onboarding training progress", () => {
  it("records the first evidence without completing training", async () => {
    const { tx, store } = setup();
    const result = await recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence }, { store },
    );

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      completedModules: 1,
      totalModules: 4,
      percentage: 25,
      readyToComplete: false,
    });
    expect(tx.saveProgress).toHaveBeenCalledWith(
      "training-step",
      expect.objectContaining({
        trainingPlanVersion: "2026-08-v1",
        trainingEvidence: [evidence],
      }),
      expect.any(Date),
    );
  });

  it("replays identical evidence without another write", async () => {
    const { tx, store } = setup([evidence]);
    await expect(recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence }, { store },
    )).resolves.toMatchObject({ ok: true, replayed: true, percentage: 25 });
    expect(tx.saveProgress).not.toHaveBeenCalled();
  });

  it("updates evidence for the same module and participant", async () => {
    const { tx, store } = setup([{ ...evidence, score: 60 }]);
    await recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence }, { store },
    );
    expect(tx.saveProgress).toHaveBeenCalledWith(
      "training-step",
      expect.objectContaining({ trainingEvidence: [evidence] }),
      expect.any(Date),
    );
  });

  it("reports readiness only after every mandatory module", async () => {
    const previous = [
      evidence,
      { ...evidence, moduleCode: "scheduling_operations", score: 85 },
      { ...evidence, moduleCode: "team_operations" },
    ];
    const finalEvidence = { ...evidence, moduleCode: "channels_and_support" as const };
    const { store } = setup(previous);
    await expect(recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence: finalEvidence }, { store },
    )).resolves.toMatchObject({
      ok: true,
      completedModules: 4,
      percentage: 100,
      readyToComplete: true,
      missingModules: [],
    });
  });

  it("rejects malformed evidence before accessing the store", async () => {
    const { store } = setup();
    const result = await recordCommercialOnboardingTrainingProgress({
      onboardingId,
      context,
      evidence: { ...evidence, acknowledged: false },
    });
    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("rejects progress outside the active training step", async () => {
    const { store } = setup([], "completed");
    await expect(recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence }, { store },
    )).resolves.toMatchObject({ ok: false, error: "training_not_available" });
  });

  it("reports a missing training step", async () => {
    const tx = { findTraining: vi.fn().mockResolvedValue(null), saveProgress: vi.fn() };
    const store = { transaction: vi.fn((callback) => callback(tx)) };
    await expect(recordCommercialOnboardingTrainingProgress(
      { onboardingId, context, evidence }, { store },
    )).resolves.toMatchObject({ ok: false, error: "training_not_found" });
  });
});
