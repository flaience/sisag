import { describe, expect, it } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { buildCommercialPostActivationMonitoring } from "./commercial-post-activation-monitoring.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const plan = buildCommercialPostActivationFollowUp({
  onboardingId,
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:00:00.000Z",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
})!;

const now = () => new Date("2026-08-14T00:00:00.000Z");

function result(overrides: Record<string, unknown> = {}) {
  return { postActivationFollowUpPlan: plan, ...overrides };
}

function observation(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "observation-1",
    milestoneCode: "welcome",
    indicator: "welcome_delivered",
    value: true,
    observedAt: "2026-08-13T02:00:00.000Z",
    source: { type: "system", id: "test" },
    ...overrides,
  };
}

describe("commercial post-activation monitoring", () => {
  it("reports a future milestone as scheduled", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result(),
    }, {
      now: () => new Date("2026-08-12T00:00:00.000Z"),
    })).toMatchObject({
      ok: true,
      monitoring: {
        status: "scheduled",
        currentMilestone: { code: "welcome", ownerType: "agent" },
        processedMilestones: 0,
        completedMilestones: 0,
        escalatedMilestones: 0,
        totalMilestones: 5,
        supportWindowExpired: false,
      },
    });
  });

  it("reports a due milestone without evidence as overdue", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result(),
    }, { now })).toMatchObject({
      ok: true,
      monitoring: {
        status: "overdue",
        currentMilestone: { code: "welcome" },
        missingIndicators: ["welcome_delivered", "support_channel_confirmed"],
      },
    });
  });

  it("reports a partially evidenced milestone as waiting", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({ postActivationObservations: [observation()] }),
    }, { now })).toMatchObject({
      ok: true,
      monitoring: {
        status: "waiting",
        missingIndicators: ["support_channel_confirmed"],
        activeEscalations: [],
      },
    });
  });

  it("reports an active escalation trigger", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({
        postActivationObservations: [observation({
          indicator: "welcome_delivery_failed",
        })],
      }),
    }, { now })).toMatchObject({
      ok: true,
      monitoring: {
        status: "escalated",
        activeEscalations: ["welcome_delivery_failed"],
      },
    });
  });

  it("preserves an escalation recorded in an earlier milestone", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({
        postActivationMilestoneExecutions: [{
          milestoneCode: "welcome",
          outcome: "escalated",
          processedAt: "2026-08-13T02:00:00.000Z",
        }],
      }),
    }, { now })).toMatchObject({
      ok: true,
      monitoring: {
        status: "escalated",
        currentMilestone: { code: "adoption_d1" },
        processedMilestones: 1,
        completedMilestones: 0,
        escalatedMilestones: 1,
        lastProcessedAt: "2026-08-13T02:00:00.000Z",
      },
    });
  });

  it("reports a fully processed plan as completed", () => {
    const executions = plan.milestones.map((milestone) => ({
      milestoneCode: milestone.code,
      outcome: "completed" as const,
      processedAt: milestone.dueAt,
    }));
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({ postActivationMilestoneExecutions: executions }),
    }, {
      now: () => new Date("2026-08-28T00:00:00.000Z"),
    })).toMatchObject({
      ok: true,
      monitoring: {
        status: "completed",
        currentMilestone: null,
        processedMilestones: 5,
        completedMilestones: 5,
        escalatedMilestones: 0,
        supportWindowExpired: true,
      },
    });
  });

  it("rejects a missing or malformed plan", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: {},
    })).toMatchObject({ ok: false, error: "follow_up_not_scheduled" });
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: { postActivationFollowUpPlan: { invalid: true } },
    })).toMatchObject({ ok: false, error: "invalid_follow_up_state" });
  });

  it("rejects duplicate milestone executions", () => {
    const execution = {
      milestoneCode: "welcome",
      outcome: "completed",
      processedAt: "2026-08-13T02:00:00.000Z",
    };
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({ postActivationMilestoneExecutions: [execution, execution] }),
    })).toMatchObject({ ok: false, error: "invalid_follow_up_state" });
  });

  it("rejects an invalid observation history", () => {
    expect(buildCommercialPostActivationMonitoring({
      onboardingId,
      result: result({ postActivationObservations: [{ invalid: true }] }),
    }, { now })).toMatchObject({ ok: false, error: "invalid_follow_up_state" });
  });
});
