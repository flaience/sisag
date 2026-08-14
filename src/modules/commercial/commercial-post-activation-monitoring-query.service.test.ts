import { describe, expect, it, vi } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { listCommercialPostActivationMonitoring } from "./commercial-post-activation-monitoring-query.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const secondOnboardingId = "33164020-8778-4226-afed-189e8d2333cc";

function plan(id: string, activatedAt = "2026-08-13T01:00:00.000Z") {
  return buildCommercialPostActivationFollowUp({
    onboardingId: id,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
    activatedAt,
    context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
  })!;
}

function candidate(id = onboardingId, activatedAt?: string): {
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
  clientStatus: "active";
  result: Record<string, unknown>;
} {
  return {
    onboardingId: id,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: `Client ${id.slice(0, 4)}`,
    clientStatus: "active" as const,
    result: { postActivationFollowUpPlan: plan(id, activatedAt) },
  };
}

const now = () => new Date("2026-08-14T00:00:00.000Z");

describe("commercial post-activation monitoring query", () => {
  it("lists valid monitoring views", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([candidate()]) };
    await expect(listCommercialPostActivationMonitoring({}, { store, now })).resolves.toMatchObject({
      ok: true,
      data: {
        items: [{
          onboardingId,
          clientName: "Client 2316",
          clientStatus: "active",
          monitoring: { status: "overdue", currentMilestone: { code: "welcome" } },
        }],
        summary: { overdue: 1 },
        invalidRecords: 0,
      },
    });
    expect(store.listCandidates).toHaveBeenCalledWith(100);
  });

  it("filters by monitoring status", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([
      candidate(onboardingId),
      candidate(secondOnboardingId, "2026-08-20T01:00:00.000Z"),
    ]) };
    const response = await listCommercialPostActivationMonitoring({
      status: "scheduled",
    }, { store, now });
    expect(response.ok && response.data.items).toHaveLength(1);
    expect(response.ok && response.data.items[0]?.onboardingId).toBe(secondOnboardingId);
  });

  it("orders critical clients before scheduled clients", async () => {
    const escalated = candidate(onboardingId);
    escalated.result = {
      postActivationFollowUpPlan: plan(onboardingId),
      postActivationObservations: [{
        idempotencyKey: "failure-1",
        milestoneCode: "welcome",
        indicator: "welcome_delivery_failed",
        value: true,
        observedAt: "2026-08-13T02:00:00.000Z",
        source: { type: "system", id: "test" },
      }],
    };
    const store = { listCandidates: vi.fn().mockResolvedValue([
      candidate(secondOnboardingId, "2026-08-20T01:00:00.000Z"),
      escalated,
    ]) };
    const response = await listCommercialPostActivationMonitoring({}, { store, now });
    expect(response.ok && response.data.items.map((item) => item.monitoring.status))
      .toEqual(["escalated", "scheduled"]);
  });

  it("isolates invalid records", async () => {
    const invalid = candidate(onboardingId);
    invalid.result = { postActivationFollowUpPlan: { invalid: true } };
    const store = { listCandidates: vi.fn().mockResolvedValue([
      invalid,
      candidate(secondOnboardingId),
    ]) };
    await expect(listCommercialPostActivationMonitoring({}, { store, now })).resolves.toMatchObject({
      ok: true,
      data: {
        items: [{ onboardingId: secondOnboardingId }],
        invalidRecords: 1,
        failures: [{ onboardingId, error: "invalid_follow_up_state" }],
      },
    });
  });

  it("limits the prioritized result", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([
      candidate(onboardingId),
      candidate(secondOnboardingId, "2026-08-20T01:00:00.000Z"),
    ]) };
    const response = await listCommercialPostActivationMonitoring({ limit: 1 }, { store, now });
    expect(response.ok && response.data.items).toHaveLength(1);
    expect(response.ok && response.data.items[0]?.monitoring.status).toBe("overdue");
  });

  it("summarizes only returned records", async () => {
    const store = { listCandidates: vi.fn().mockResolvedValue([
      candidate(onboardingId),
      candidate(secondOnboardingId, "2026-08-20T01:00:00.000Z"),
    ]) };
    await expect(listCommercialPostActivationMonitoring({}, { store, now })).resolves.toMatchObject({
      ok: true,
      data: {
        summary: {
          scheduled: 1,
          waiting: 0,
          overdue: 1,
          escalated: 0,
          completed: 0,
        },
      },
    });
  });

  it("rejects invalid input before querying", async () => {
    const store = { listCandidates: vi.fn() };
    await expect(listCommercialPostActivationMonitoring({
      limit: 0,
    }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.listCandidates).not.toHaveBeenCalled();
  });
});
