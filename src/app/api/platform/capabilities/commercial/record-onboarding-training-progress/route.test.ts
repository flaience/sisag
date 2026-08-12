import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ progress: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-onboarding-training-progress.service", () => ({
  recordCommercialOnboardingTrainingProgress: mocks.progress,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  context: { businessType: "generic", activeChannels: ["meta"], teamSize: 1 },
  evidence: {
    moduleCode: "platform_basics",
    completedBy: { id: "2d3a4184-d8f8-4dfa-a694-466d15f950ee", name: "Luis" },
    completedAt: "2026-08-12T18:00:00.000Z",
    score: 90,
    acknowledged: true,
    evidence: "Simulação assistida concluída.",
  },
};

const request = (body: unknown) => new Request("http://localhost/training-progress", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST commercial record-onboarding-training-progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before recording progress", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it("returns the normalized training progress", async () => {
    mocks.progress.mockResolvedValue({
      ok: true,
      replayed: false,
      onboardingId,
      completedModules: 1,
      totalModules: 4,
      percentage: 25,
      readyToComplete: false,
      missingModules: ["scheduling_operations", "team_operations", "channels_and_support"],
    });

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        completedModules: 1,
        totalModules: 4,
        percentage: 25,
        readyToComplete: false,
        missingModules: ["scheduling_operations", "team_operations", "channels_and_support"],
      },
    });
    expect(mocks.progress).toHaveBeenCalledWith(input);
  });

  it("preserves an idempotent replay", async () => {
    mocks.progress.mockResolvedValue({
      ok: true, replayed: true, onboardingId, completedModules: 1,
      totalModules: 4, percentage: 25, readyToComplete: false,
      missingModules: ["scheduling_operations", "team_operations", "channels_and_support"],
    });
    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, percentage: 25 },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["training_not_found", 404, "COMMERCIAL_ONBOARDING_TRAINING_NOT_FOUND"],
    ["training_not_available", 409, "COMMERCIAL_ONBOARDING_TRAINING_NOT_AVAILABLE"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.progress.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before recording progress", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.progress.mockRejectedValue(new Error("private database credential"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível registrar o progresso do treinamento comercial.",
      },
    });
  });
});
