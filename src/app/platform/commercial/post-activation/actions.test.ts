import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  requirePlatformOperator: vi.fn(),
  recordAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/auth/requirePlatformOperator", () => ({
  requirePlatformOperator: mocks.requirePlatformOperator,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-action.service", () => ({
  recordCommercialPostActivationAlertAction: mocks.recordAction,
}));

import { performPostActivationAlertAction } from "./actions";

const input = {
  requestId: "ebeb7b50-35b5-4b10-8f75-c4bc25a427c3",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  alertKey: "23164020-8778-4226-afed-189e8d2333cc:human_escalation:welcome",
  action: "acknowledged" as const,
};

describe("platform post-activation alert actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T16:00:00.000Z"));
    mocks.getSupabaseServerClient.mockResolvedValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: "platform-access-token" } },
        })),
      },
    });
    mocks.requirePlatformOperator.mockResolvedValue({
      userId: "operator-1",
      email: "operator@sisag.test",
      name: "Operador SISAG",
      role: "operator",
    });
    mocks.recordAction.mockResolvedValue({
      ok: true,
      replayed: false,
      onboardingId: input.onboardingId,
      alertKey: input.alertKey,
      action: input.action,
      actionCount: 1,
      emittedEvents: ["commercial.post_activation.alert_acknowledged"],
    });
  });

  it("rejects invalid input before loading the session", async () => {
    const result = await performPostActivationAlertAction({
      ...input,
      requestId: "invalid",
    });

    expect(result).toEqual({ ok: false, message: "A ação informada é inválida." });
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.recordAction).not.toHaveBeenCalled();
  });

  it("records an authenticated and idempotent operator action", async () => {
    const result = await performPostActivationAlertAction(input);

    expect(mocks.requirePlatformOperator).toHaveBeenCalledWith("platform-access-token");
    expect(mocks.recordAction).toHaveBeenCalledWith({
      onboardingId: input.onboardingId,
      alertAction: {
        idempotencyKey: `platform-alert:${input.requestId}`,
        alertKey: input.alertKey,
        action: "acknowledged",
        actor: { type: "human", id: "operator-1" },
        actedAt: "2026-08-15T16:00:00.000Z",
      },
    });
    expect(result).toEqual({ ok: true, message: "Alerta reconhecido com sucesso." });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/platform/commercial/post-activation");
  });

  it("returns the resolution confirmation", async () => {
    mocks.recordAction.mockResolvedValue({
      ok: true,
      replayed: false,
      onboardingId: input.onboardingId,
      alertKey: input.alertKey,
      action: "resolved",
      actionCount: 2,
      emittedEvents: ["commercial.post_activation.alert_resolved"],
    });

    await expect(performPostActivationAlertAction({
      ...input,
      action: "resolved",
    })).resolves.toEqual({
      ok: true,
      message: "Alerta resolvido com sucesso.",
    });
  });

  it("does not expose controlled service failure details", async () => {
    mocks.recordAction.mockResolvedValue({
      ok: false,
      error: "alert_not_active",
      message: "private alert state detail",
    });

    const result = await performPostActivationAlertAction(input);

    expect(result).toEqual({
      ok: false,
      message: "Não foi possível atualizar o alerta. Atualize o painel e tente novamente.",
    });
    expect(JSON.stringify(result)).not.toContain("private alert state detail");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
