import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ progress: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-onboarding-go-live-progress.service", () => ({
  recordCommercialOnboardingGoLiveProgress: mocks.progress,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  evidence: {
    checkCode: "company_configuration",
    status: "passed",
    checkedAt: "2026-08-12T21:00:00.000Z",
    checkedBy: { type: "system", id: "production-readiness" },
    details: "Configuração da empresa validada.",
  },
};

const request = (body: unknown) => new Request("http://localhost/go-live-progress", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST commercial record-onboarding-go-live-progress", () => {
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

  it("returns normalized go-live progress", async () => {
    mocks.progress.mockResolvedValue({
      ok: true,
      replayed: false,
      onboardingId,
      passedChecks: 1,
      totalChecks: 6,
      percentage: 17,
      readyToComplete: false,
      missingChecks: [
        "scheduling_configuration",
        "team_configuration",
        "active_channels",
        "training_completion",
        "operational_health",
      ],
      failedChecks: [],
    });

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        passedChecks: 1,
        totalChecks: 6,
        percentage: 17,
        readyToComplete: false,
        missingChecks: [
          "scheduling_configuration",
          "team_configuration",
          "active_channels",
          "training_completion",
          "operational_health",
        ],
        failedChecks: [],
      },
    });
    expect(mocks.progress).toHaveBeenCalledWith(input);
  });

  it("preserves an idempotent replay", async () => {
    mocks.progress.mockResolvedValue({
      ok: true, replayed: true, onboardingId, passedChecks: 1,
      totalChecks: 6, percentage: 17, readyToComplete: false,
      missingChecks: ["operational_health"], failedChecks: [],
    });
    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, percentage: 17 },
    });
  });

  it("returns failed and missing checks without conflating them", async () => {
    mocks.progress.mockResolvedValue({
      ok: true, replayed: false, onboardingId, passedChecks: 0,
      totalChecks: 6, percentage: 0, readyToComplete: false,
      missingChecks: ["operational_health"], failedChecks: ["active_channels"],
    });
    const response = await POST(request(input));
    await expect(response.json()).resolves.toMatchObject({
      data: {
        missingChecks: ["operational_health"],
        failedChecks: ["active_channels"],
      },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["go_live_not_found", 404, "COMMERCIAL_ONBOARDING_GO_LIVE_NOT_FOUND"],
    ["go_live_not_available", 409, "COMMERCIAL_ONBOARDING_GO_LIVE_NOT_AVAILABLE"],
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
    mocks.progress.mockRejectedValue(new Error("private go-live database detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível registrar o progresso da validação de go-live.",
      },
    });
  });
});

