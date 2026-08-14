import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ record: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-post-activation-observations.service", () => ({
  recordCommercialPostActivationObservation: mocks.record,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  observation: {
    idempotencyKey: `${onboardingId}:welcome:welcome_delivered:message-1`,
    milestoneCode: "welcome",
    indicator: "welcome_delivered",
    value: true,
    observedAt: "2026-08-14T12:00:00.000Z",
    source: { type: "system", id: "outbox-dispatcher" },
  },
};

const request = (body: unknown) => new Request("http://localhost/record-observation", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const success = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  replayed: false,
  onboardingId,
  milestoneCode: "welcome",
  indicator: "welcome_delivered",
  observationCount: 1,
  ...overrides,
});

describe("POST commercial record-post-activation-observation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before recording", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request(input))).toBe(denied);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("creates an observation with HTTP 201", async () => {
    mocks.record.mockResolvedValue(success());

    const response = await POST(request(input));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        milestoneCode: "welcome",
        indicator: "welcome_delivered",
        observationCount: 1,
      },
    });
    expect(mocks.record).toHaveBeenCalledWith(input);
  });

  it("returns an idempotent replay with HTTP 200", async () => {
    mocks.record.mockResolvedValue(success({ replayed: true }));

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { replayed: true, observationCount: 1 },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["post_activation_not_available", 409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
    ["milestone_not_found", 404, "COMMERCIAL_POST_ACTIVATION_MILESTONE_NOT_FOUND"],
    ["observation_conflict", 409, "COMMERCIAL_POST_ACTIVATION_OBSERVATION_CONFLICT"],
    ["invalid_observation_history", 409, "COMMERCIAL_POST_ACTIVATION_INVALID_OBSERVATION_HISTORY"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.record.mockResolvedValue({ ok: false, error, message: "Falha controlada." });

    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before recording", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.record.mockRejectedValue(new Error("private observation database detail"));

    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível registrar a observação pós-ativação.",
      },
    });
  });
});
