import { describe, expect, it } from "vitest";

import {
  decideCommercialPostActivationDueWorkDeferral,
} from "./commercial-post-activation-due-work-deferral-policy.service";

const workId = "23164020-8778-4226-afed-189e8d2333cc";
const now = new Date("2026-08-24T18:00:00.000Z");

describe("commercial post-activation due work deferral policy", () => {
  it("starts a bounded durable wait", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 0,
      firstDeferredAt: null,
      deferSeconds: 900,
      missingIndicators: ["support_channel_confirmed"],
    }, { now: () => now })).toEqual({
      ok: true,
      workId,
      action: "defer",
      reason: null,
      deferredCount: 1,
      firstDeferredAt: "2026-08-24T18:00:00.000Z",
      nextAvailableAt: "2026-08-24T18:15:00.000Z",
      escalationRequired: false,
      missingIndicators: ["support_channel_confirmed"],
    });
  });

  it("continues an existing wait without resetting its origin", () => {
    const result = decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 3,
      firstDeferredAt: "2026-08-24T17:15:00.000Z",
      deferSeconds: 900,
      missingIndicators: [],
    }, { now: () => now });
    expect(result).toMatchObject({
      ok: true,
      action: "defer",
      deferredCount: 4,
      firstDeferredAt: "2026-08-24T17:15:00.000Z",
    });
  });

  it("deduplicates indicators for stable operational evidence", () => {
    const result = decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 0,
      firstDeferredAt: null,
      missingIndicators: ["usage_observed", "support_channel_confirmed", "usage_observed"],
    }, { now: () => now });
    expect(result).toMatchObject({
      missingIndicators: ["support_channel_confirmed", "usage_observed"],
    });
  });

  it("caps the next check at the wait deadline", () => {
    const result = decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 2,
      firstDeferredAt: "2026-08-24T17:50:00.000Z",
      deferSeconds: 900,
    }, { now: () => now, maxWaitSeconds: 1200 });
    expect(result).toMatchObject({
      action: "defer",
      nextAvailableAt: "2026-08-24T18:10:00.000Z",
    });
  });

  it("escalates when the deferral count reaches its limit", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 4,
      firstDeferredAt: "2026-08-24T17:00:00.000Z",
    }, { now: () => now, maxDeferrals: 4 })).toMatchObject({
      ok: true,
      action: "escalate",
      reason: "deferral_limit_reached",
      escalationRequired: true,
      nextAvailableAt: null,
    });
  });

  it("escalates when the maximum wait has elapsed", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 1,
      firstDeferredAt: "2026-08-24T17:00:00.000Z",
    }, { now: () => now, maxWaitSeconds: 3600 })).toMatchObject({
      ok: true,
      action: "escalate",
      reason: "wait_deadline_reached",
    });
  });

  it("rejects inconsistent deferral history", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 2,
      firstDeferredAt: null,
    }, { now: () => now })).toMatchObject({
      ok: false,
      error: "invalid_deferral_history",
    });
  });

  it("rejects a future deferral origin", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 1,
      firstDeferredAt: "2026-08-25T18:00:00.000Z",
    }, { now: () => now })).toMatchObject({
      ok: false,
      error: "invalid_deferral_history",
    });
  });

  it("rejects invalid policy configuration", () => {
    expect(decideCommercialPostActivationDueWorkDeferral({
      workId,
      deferredCount: 0,
      firstDeferredAt: null,
    }, { now: () => now, maxDeferrals: 0 })).toMatchObject({
      ok: false,
      error: "invalid_policy",
    });
  });
});
