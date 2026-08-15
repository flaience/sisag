import { describe, expect, it, vi } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { recordCommercialPostActivationAlertAction } from "./commercial-post-activation-alert-action.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const alertKey = `${onboardingId}:milestone_overdue:welcome`;
const plan = buildCommercialPostActivationFollowUp({
  onboardingId,
  commercialClientId,
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:01:46.809Z",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
})!;

const alertAction = {
  idempotencyKey: "operator-action-1",
  alertKey,
  action: "acknowledged" as const,
  note: "Operador iniciou o atendimento.",
  actor: { type: "human" as const, id: "operator-1" },
  actedAt: "2026-08-14T12:00:00.000Z",
};

function createStore(result: Record<string, unknown> = { postActivationFollowUpPlan: plan }) {
  const tx = {
    findOnboarding: vi.fn(async () => ({
      onboardingId,
      commercialClientId,
      clientName: "Clínica Exemplo",
      status: "completed",
      result,
    })),
    saveResult: vi.fn(async () => undefined),
    emit: vi.fn(async () => true),
  };
  return {
    tx,
    store: { transaction: async <T>(callback: (value: typeof tx) => Promise<T>) => callback(tx) },
  };
}

const now = () => new Date("2026-08-14T12:00:00.000Z");

describe("commercial post-activation alert action", () => {
  it("acknowledges an active alert and emits an audit event atomically", async () => {
    const { store, tx } = createStore();

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction,
    }, { store, now });

    expect(result).toEqual({
      ok: true,
      replayed: false,
      onboardingId,
      alertKey,
      action: "acknowledged",
      actionCount: 1,
      emittedEvents: ["commercial.post_activation.alert_acknowledged"],
    });
    expect(tx.saveResult).toHaveBeenCalledWith(onboardingId, expect.objectContaining({
      postActivationAlertActions: [alertAction],
    }), now());
    expect(tx.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "commercial.post_activation.alert_acknowledged",
      dedupeKey: "commercial.post_activation.alert_acknowledged:operator-action-1",
    }));
  });

  it("records resolution with its own event", async () => {
    const { store, tx } = createStore();
    const resolved = { ...alertAction, idempotencyKey: "operator-action-2", action: "resolved" as const };

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction: resolved,
    }, { store, now });

    expect(result.ok && result.action).toBe("resolved");
    expect(tx.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "commercial.post_activation.alert_resolved",
    }));
  });

  it("replays an identical idempotent action without writes or events", async () => {
    const { store, tx } = createStore({
      postActivationFollowUpPlan: plan,
      postActivationAlertActions: [alertAction],
    });

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction,
    }, { store, now });

    expect(result).toEqual(expect.objectContaining({ ok: true, replayed: true, actionCount: 1 }));
    expect(tx.saveResult).not.toHaveBeenCalled();
    expect(tx.emit).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key for another action", async () => {
    const { store, tx } = createStore({
      postActivationFollowUpPlan: plan,
      postActivationAlertActions: [alertAction],
    });

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction: { ...alertAction, action: "resolved" },
    }, { store, now });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "action_conflict" }));
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("rejects an alert that is not active", async () => {
    const { store, tx } = createStore();

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction: { ...alertAction, alertKey: `${onboardingId}:milestone_overdue:adoption_d7` },
    }, { store, now });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "alert_not_active" }));
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("rejects an invalid action history", async () => {
    const { store } = createStore({
      postActivationFollowUpPlan: plan,
      postActivationAlertActions: [{ invalid: true }],
    });

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction,
    }, { store, now });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "invalid_action_history" }));
  });

  it("rejects unavailable onboarding and post-activation states", async () => {
    const missing = createStore();
    missing.tx.findOnboarding.mockResolvedValueOnce(null as never);
    await expect(recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction,
    }, { store: missing.store, now })).resolves.toEqual(expect.objectContaining({
      ok: false,
      error: "onboarding_not_found",
    }));

    const incomplete = createStore();
    incomplete.tx.findOnboarding.mockResolvedValueOnce({
      onboardingId,
      commercialClientId,
      clientName: "Clínica Exemplo",
      status: "in_progress",
      result: {},
    });
    await expect(recordCommercialPostActivationAlertAction({
      onboardingId,
      alertAction,
    }, { store: incomplete.store, now })).resolves.toEqual(expect.objectContaining({
      ok: false,
      error: "post_activation_not_available",
    }));
  });

  it("rejects malformed input before opening a transaction", async () => {
    const { store } = createStore();
    const transaction = vi.spyOn(store, "transaction");

    const result = await recordCommercialPostActivationAlertAction({
      onboardingId: "invalid",
      alertAction,
    }, { store, now });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "invalid_input" }));
    expect(transaction).not.toHaveBeenCalled();
  });
});
