import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ schedule: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-post-activation-scheduling.service", () => ({
  scheduleCommercialPostActivation: mocks.schedule,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  context: {
    businessType: "clinic",
    activeChannels: ["meta"],
    teamSize: 1,
  },
  scheduledBy: { type: "system", id: "post-activation-agent" },
};

const request = (body: unknown) => new Request("http://localhost/post-activation", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const success = (replayed: boolean) => ({
  ok: true,
  replayed,
  onboardingId,
  planKey: `${onboardingId}:post_activation:2026-08-v1`,
  supportWindowEndsAt: "2026-08-27T01:01:46.809Z",
  milestoneCount: 5,
  emittedEvents: replayed ? [] : ["commercial.post_activation.follow_up_scheduled"],
});

describe("POST commercial schedule-post-activation-follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before scheduling", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request(input))).toBe(denied);
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("creates the post-activation schedule", async () => {
    mocks.schedule.mockResolvedValue(success(false));

    const response = await POST(request(input));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        onboardingId,
        planKey: `${onboardingId}:post_activation:2026-08-v1`,
        supportWindowEndsAt: "2026-08-27T01:01:46.809Z",
        milestoneCount: 5,
      },
      emittedEvents: ["commercial.post_activation.follow_up_scheduled"],
    });
    expect(mocks.schedule).toHaveBeenCalledWith(input);
  });

  it("returns an idempotent replay with HTTP 200", async () => {
    mocks.schedule.mockResolvedValue(success(true));

    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, milestoneCount: 5 },
      emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["activation_not_available", 409, "COMMERCIAL_POST_ACTIVATION_NOT_AVAILABLE"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.schedule.mockResolvedValue({ ok: false, error, message: "Falha controlada." });

    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before scheduling", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.schedule.mockRejectedValue(new Error("private post-activation database detail"));

    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível agendar o acompanhamento pós-ativação.",
      },
    });
  });
});
