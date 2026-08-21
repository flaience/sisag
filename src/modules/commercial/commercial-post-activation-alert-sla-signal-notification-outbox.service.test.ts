import { describe, expect, it, vi } from "vitest";

import { enqueueCommercialPostActivationAlertSlaSignalNotifications } from "./commercial-post-activation-alert-sla-signal-notification-outbox.service";

const notification = {
  key: "commercial.post_activation.alert_sla_breached:alert-1:sla_resolution_breached",
  dedupeKey: "commercial.post_activation.alert_sla_breached:alert-1:sla_resolution_breached",
  eventType: "commercial.post_activation.alert_sla_breached" as const,
  aggregateType: "commercial_post_activation_alert" as const,
  aggregateKey: "alert-1",
  payload: {
    signalKey: "alert-1:sla_resolution_breached",
    alertKey: "alert-1",
    breachType: "resolution_breached" as const,
    severity: "critical" as const,
    priority: "critical" as const,
    elapsedMinutes: 300,
    targetMinutes: 240,
    overdueMinutes: 60,
  },
};

function store(outcomes: Array<"queued" | "replayed" | "missing_occurrence"> = ["queued"]) {
  const tx = { enqueue: vi.fn() };
  outcomes.forEach((outcome) => tx.enqueue.mockResolvedValueOnce(outcome));
  return {
    tx,
    transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

describe("commercial post-activation alert SLA signal notification outbox", () => {
  it("queues a notification inside one transaction", async () => {
    const storage = store();
    const result = await enqueueCommercialPostActivationAlertSlaSignalNotifications(
      { notifications: [notification] },
      { store: storage },
    );

    expect(storage.tx.enqueue).toHaveBeenCalledWith(notification);
    expect(result).toEqual({
      ok: true,
      queued: 1,
      replayed: 0,
      missingOccurrences: 0,
      total: 1,
    });
  });

  it("reports replayed dedupe keys without queuing duplicates", async () => {
    const storage = store(["replayed"]);
    await expect(enqueueCommercialPostActivationAlertSlaSignalNotifications(
      { notifications: [notification] },
      { store: storage },
    )).resolves.toEqual({
      ok: true,
      queued: 0,
      replayed: 1,
      missingOccurrences: 0,
      total: 1,
    });
  });

  it("keeps missing durable occurrences observable", async () => {
    const storage = store(["missing_occurrence"]);
    await expect(enqueueCommercialPostActivationAlertSlaSignalNotifications(
      { notifications: [notification] },
      { store: storage },
    )).resolves.toEqual({
      ok: true,
      queued: 0,
      replayed: 0,
      missingOccurrences: 1,
      total: 1,
    });
  });

  it("accepts an empty notification set", async () => {
    const storage = store([]);
    await expect(enqueueCommercialPostActivationAlertSlaSignalNotifications(
      { notifications: [] },
      { store: storage },
    )).resolves.toEqual({
      ok: true,
      queued: 0,
      replayed: 0,
      missingOccurrences: 0,
      total: 0,
    });
    expect(storage.tx.enqueue).not.toHaveBeenCalled();
  });

  it("rejects malformed notifications before opening a transaction", async () => {
    const storage = store();
    const result = await enqueueCommercialPostActivationAlertSlaSignalNotifications({
      notifications: [{ ...notification, eventType: "unexpected.event" }],
    }, { store: storage });

    expect(result).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Intenções de notificação dos sinais de SLA inválidas.",
    });
    expect(storage.transaction).not.toHaveBeenCalled();
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const storage = store();
    storage.tx.enqueue.mockReset().mockRejectedValue(failure);

    await expect(enqueueCommercialPostActivationAlertSlaSignalNotifications(
      { notifications: [notification] },
      { store: storage },
    )).rejects.toBe(failure);
  });
});
