import { describe, expect, it, vi } from "vitest";

import {
  canTransitionSubscription,
  changeSubscriptionStatus,
  type ChangeSubscriptionStatusInput,
  type SubscriptionStatus,
} from "./commercial-subscription-lifecycle.service";

const input: ChangeSubscriptionStatusInput = {
  subscriptionId: "67abb33b-b2e9-493e-b70f-0314faabf3dc",
  targetStatus: "active",
  actor: { type: "user", id: "2d3a4184-d8f8-4dfa-a694-466d15f950ee" },
  reason: "Ativação comercial aprovada",
};

function subscription(status: SubscriptionStatus = "trial") {
  return {
    id: input.subscriptionId,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    tenantId: "7e91fac1-b570-425f-af16-300cdf5e4684",
    planCode: "standard",
    status,
    provisioningStatus: "completed" as const,
    activatedAt: null,
    suspendedAt: null,
    cancelledAt: null,
  };
}

function createStore(current = subscription()) {
  const tx = {
    findForUpdate: vi.fn().mockResolvedValue(current),
    updateStatus: vi.fn().mockImplementation(async ({ targetStatus, changedAt }) => ({
      ...current,
      status: targetStatus,
      activatedAt:
        targetStatus === "active" ? current.activatedAt ?? changedAt : current.activatedAt,
      suspendedAt: targetStatus === "suspended" ? changedAt : null,
      cancelledAt: targetStatus === "cancelled" ? changedAt : null,
    })),
    emitStatusChanged: vi.fn().mockResolvedValue(true),
  };
  const store = {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  return { store, tx };
}

describe("commercial subscription lifecycle", () => {
  it("defines the allowed lifecycle transitions", () => {
    expect(canTransitionSubscription("trial", "active")).toBe(true);
    expect(canTransitionSubscription("active", "past_due")).toBe(true);
    expect(canTransitionSubscription("past_due", "active")).toBe(true);
    expect(canTransitionSubscription("active", "suspended")).toBe(true);
    expect(canTransitionSubscription("suspended", "active")).toBe(true);
    expect(canTransitionSubscription("cancelled", "active")).toBe(false);
    expect(canTransitionSubscription("pending", "suspended")).toBe(false);
  });

  it("validates input before opening a transaction", async () => {
    const { store } = createStore();

    await expect(
      changeSubscriptionStatus({ ...input, reason: "x" }, { store }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("activates a provisioned trial and emits an audited event", async () => {
    const { store, tx } = createStore();
    const now = new Date("2026-08-09T12:00:00.000Z");

    await expect(
      changeSubscriptionStatus(input, { store, now: () => now }),
    ).resolves.toMatchObject({
      ok: true,
      replayed: false,
      subscription: {
        previousStatus: "trial",
        status: "active",
        activatedAt: now,
      },
      emittedEvents: ["commercial.subscription.status_changed"],
    });
    expect(tx.emitStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        previousStatus: "trial",
        targetStatus: "active",
        actor: input.actor,
        reason: input.reason,
        changedAt: now,
      }),
    );
  });

  it("replays the current status without writing or emitting", async () => {
    const current = subscription("active");
    current.activatedAt = new Date("2026-08-09T12:00:00.000Z");
    const { store, tx } = createStore(current);

    await expect(changeSubscriptionStatus(input, { store })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      subscription: { previousStatus: "active", status: "active" },
      emittedEvents: [],
    });
    expect(tx.updateStatus).not.toHaveBeenCalled();
    expect(tx.emitStatusChanged).not.toHaveBeenCalled();
  });

  it("rejects activation before provisioning is completed", async () => {
    const current = { ...subscription(), provisioningStatus: "processing" as const };
    const { store, tx } = createStore(current);

    await expect(changeSubscriptionStatus(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "provisioning_incomplete",
    });
    expect(tx.updateStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid transitions from a terminal subscription", async () => {
    const { store, tx } = createStore(subscription("cancelled"));

    await expect(changeSubscriptionStatus(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "invalid_transition",
    });
    expect(tx.updateStatus).not.toHaveBeenCalled();
  });

  it("reports a concurrent status change without emitting an event", async () => {
    const { store, tx } = createStore();
    tx.updateStatus.mockResolvedValue(null);

    await expect(changeSubscriptionStatus(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "concurrent_change",
    });
    expect(tx.emitStatusChanged).not.toHaveBeenCalled();
  });

  it("returns not found without attempting a transition", async () => {
    const { store, tx } = createStore();
    tx.findForUpdate.mockResolvedValue(null);

    await expect(changeSubscriptionStatus(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "subscription_not_found",
    });
    expect(tx.updateStatus).not.toHaveBeenCalled();
  });
});
