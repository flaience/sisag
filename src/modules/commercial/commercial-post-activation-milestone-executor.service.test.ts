import { describe, expect, it } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { executeCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-executor.service";

const plan = buildCommercialPostActivationFollowUp({
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:01:46.809Z",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
})!;

const at = (value: string) => ({ now: () => new Date(value) });

describe("commercial post-activation milestone executor", () => {
  it("waits until the next milestone is due", () => {
    expect(executeCommercialPostActivationMilestone(
      { plan },
      at("2026-08-13T01:00:00.000Z"),
    )).toMatchObject({
      ok: true,
      decision: "wait",
      milestone: { code: "welcome" },
      event: null,
    });
  });

  it("waits for missing required indicators", () => {
    expect(executeCommercialPostActivationMilestone(
      { plan, observations: { welcome_delivered: true } },
      at("2026-08-13T02:00:00.000Z"),
    )).toMatchObject({
      ok: true,
      decision: "wait",
      missingIndicators: ["support_channel_confirmed"],
      event: null,
    });
  });

  it("completes a due milestone with a deterministic event", () => {
    const result = executeCommercialPostActivationMilestone({
      plan,
      observations: {
        welcome_delivered: true,
        support_channel_confirmed: true,
      },
    }, at("2026-08-13T02:00:00.000Z"));

    expect(result).toMatchObject({
      ok: true,
      decision: "completed",
      milestone: { code: "welcome", ownerType: "agent" },
      event: {
        eventType: "commercial.post_activation.milestone_completed",
        dedupeKey: `commercial.post_activation.milestone_completed:${plan.key}:welcome`,
      },
    });
  });

  it("requests human escalation when a trigger is active", () => {
    expect(executeCommercialPostActivationMilestone({
      plan,
      observations: { welcome_delivery_failed: true },
    }, at("2026-08-13T02:00:00.000Z"))).toMatchObject({
      ok: true,
      decision: "human_escalation",
      activeEscalations: ["welcome_delivery_failed"],
      event: {
        eventType: "commercial.post_activation.human_escalation_requested",
        dedupeKey: `commercial.post_activation.human_escalation_requested:${plan.key}:welcome`,
      },
    });
  });

  it("selects the first unprocessed milestone in plan order", () => {
    expect(executeCommercialPostActivationMilestone({
      plan,
      executions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    }, at("2026-08-13T03:00:00.000Z"))).toMatchObject({
      ok: true,
      decision: "wait",
      milestone: { code: "adoption_d1" },
    });
  });

  it("returns replay when every milestone was already processed", () => {
    const executions = plan.milestones.map((milestone) => ({
      milestoneCode: milestone.code,
      outcome: "completed" as const,
      processedAt: milestone.dueAt,
    }));

    expect(executeCommercialPostActivationMilestone({ plan, executions })).toMatchObject({
      ok: true,
      replayed: true,
      decision: "plan_completed",
      milestone: null,
      event: null,
    });
  });

  it("rejects malformed plans", () => {
    expect(executeCommercialPostActivationMilestone({
      plan: { ...plan, milestones: [] },
    })).toMatchObject({ ok: false, error: "invalid_input" });
  });
});
