import { describe, expect, it, vi } from "vitest";

import { recordCommercialOnboardingGoLiveProgress } from "./commercial-onboarding-go-live-progress.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const evidence = {
  checkCode: "company_configuration" as const,
  status: "passed" as const,
  checkedAt: "2026-08-12T21:00:00.000Z",
  checkedBy: { type: "system" as const, id: "production-readiness" },
  details: "Configuração da empresa validada.",
  metadata: { source: "production", checks: { registration: true, profile: true } },
};

function setup(
  savedEvidence: object[] = [],
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled" = "pending",
) {
  const tx = {
    findGoLive: vi.fn().mockResolvedValue({
      id: "go-live-step",
      status,
      input: { goLiveEvidence: savedEvidence },
    }),
    saveProgress: vi.fn().mockResolvedValue(undefined),
  };
  const store = { transaction: vi.fn((callback) => callback(tx)) };
  return { tx, store };
}

describe("commercial onboarding go-live progress", () => {
  it("records the first check without completing go-live", async () => {
    const { tx, store } = setup();
    const result = await recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence }, { store },
    );
    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      passedChecks: 1,
      totalChecks: 6,
      percentage: 17,
      readyToComplete: false,
    });
    expect(tx.saveProgress).toHaveBeenCalledWith(
      "go-live-step",
      expect.objectContaining({
        goLiveChecklistVersion: "2026-08-v1",
        goLiveEvidence: [evidence],
      }),
      expect.any(Date),
    );
  });

  it("replays semantically identical JSONB evidence", async () => {
    const reorderedEvidence = {
      metadata: { checks: { profile: true, registration: true }, source: "production" },
      details: evidence.details,
      checkedBy: { id: evidence.checkedBy.id, type: evidence.checkedBy.type },
      checkedAt: evidence.checkedAt,
      status: evidence.status,
      checkCode: evidence.checkCode,
    };
    const { tx, store } = setup([reorderedEvidence]);
    await expect(recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence }, { store },
    )).resolves.toMatchObject({ ok: true, replayed: true, percentage: 17 });
    expect(tx.saveProgress).not.toHaveBeenCalled();
  });

  it("updates a repeated check when its evidence changes", async () => {
    const { tx, store } = setup([{ ...evidence, status: "failed" }]);
    await recordCommercialOnboardingGoLiveProgress({ onboardingId, evidence }, { store });
    expect(tx.saveProgress).toHaveBeenCalledWith(
      "go-live-step",
      expect.objectContaining({ goLiveEvidence: [evidence] }),
      expect.any(Date),
    );
  });

  it("reports failed checks separately from missing checks", async () => {
    const failedEvidence = { ...evidence, status: "failed" as const };
    const { store } = setup();
    await expect(recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence: failedEvidence }, { store },
    )).resolves.toMatchObject({
      ok: true,
      passedChecks: 0,
      percentage: 0,
      failedChecks: ["company_configuration"],
      missingChecks: expect.not.arrayContaining(["company_configuration"]),
    });
  });

  it("reports readiness after all mandatory checks pass", async () => {
    const previous = [
      evidence,
      { ...evidence, checkCode: "scheduling_configuration" as const },
      { ...evidence, checkCode: "team_configuration" as const },
      { ...evidence, checkCode: "active_channels" as const },
      { ...evidence, checkCode: "training_completion" as const },
    ];
    const finalEvidence = { ...evidence, checkCode: "operational_health" as const };
    const { store } = setup(previous);
    await expect(recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence: finalEvidence }, { store },
    )).resolves.toMatchObject({
      ok: true,
      passedChecks: 6,
      percentage: 100,
      readyToComplete: true,
      missingChecks: [],
      failedChecks: [],
    });
  });

  it("rejects malformed evidence before accessing the store", async () => {
    const { store } = setup();
    const result = await recordCommercialOnboardingGoLiveProgress({
      onboardingId,
      evidence: { ...evidence, details: "" },
    });
    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("rejects progress outside the active go-live step", async () => {
    const { store } = setup([], "completed");
    await expect(recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence }, { store },
    )).resolves.toMatchObject({ ok: false, error: "go_live_not_available" });
  });

  it("reports a missing go-live step", async () => {
    const tx = { findGoLive: vi.fn().mockResolvedValue(null), saveProgress: vi.fn() };
    const store = { transaction: vi.fn((callback) => callback(tx)) };
    await expect(recordCommercialOnboardingGoLiveProgress(
      { onboardingId, evidence }, { store },
    )).resolves.toMatchObject({ ok: false, error: "go_live_not_found" });
  });
});

