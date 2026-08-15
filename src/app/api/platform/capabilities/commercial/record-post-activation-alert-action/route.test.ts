import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ record: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-action.service", () => ({
  recordCommercialPostActivationAlertAction: mocks.record,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const alertKey = `${onboardingId}:milestone_overdue:welcome`;
const input = {
  onboardingId,
  alertAction: {
    idempotencyKey: "operator-action-1",
    alertKey,
    action: "acknowledged",
    note: "Operador iniciou o atendimento.",
    actor: { type: "human", id: "operator-1" },
    actedAt: "2026-08-15T12:00:00.000Z",
  },
};

const request = (body: unknown) => new Request("http://localhost/record-alert-action", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const success = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  replayed: false,
  onboardingId,
  alertKey,
  action: "acknowledged",
  actionCount: 1,
  emittedEvents: ["commercial.post_activation.alert_acknowledged"],
  ...overrides,
});

describe("POST commercial record-post-activation-alert-action", () => {
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

  it("creates an alert action with HTTP 201", async () => {
    mocks.record.mockResolvedValue(success());

    const response = await POST(request(input));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        alertKey,
        action: "acknowledged",
        actionCount: 1,
      },
      emittedEvents: ["commercial.post_activation.alert_acknowledged"],
    });
    expect(mocks.record).toHaveBeenCalledWith(input);
  });

  it("returns an idempotent replay with HTTP 200", async () => {
    mocks.record.mockResolvedValue(success({ replayed: true, emittedEvents: [] }));

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { replayed: true, actionCount: 1 },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["post_activation_not_available", 409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
    ["alert_not_active", 409, "COMMERCIAL_POST_ACTIVATION_ALERT_NOT_ACTIVE"],
    ["action_conflict", 409, "COMMERCIAL_POST_ACTIVATION_ALERT_ACTION_CONFLICT"],
    ["invalid_action_history", 409, "COMMERCIAL_POST_ACTIVATION_INVALID_ALERT_ACTION_HISTORY"],
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
    mocks.record.mockRejectedValue(new Error("private alert action database detail"));

    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível registrar a ação sobre o alerta pós-ativação.",
      },
    });
  });

  it("validates the internal request exactly once", async () => {
    mocks.record.mockResolvedValue(success());
    await POST(request(input));
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
