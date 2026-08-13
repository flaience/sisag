import { describe, expect, it } from "vitest";

import {
  buildCommercialPostActivationFollowUp,
  evaluateCommercialPostActivationMilestone,
} from "./commercial-post-activation-follow-up.service";

const input = {
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:01:46.809Z",
  context: { businessType: "clinic", activeChannels: ["Meta", "meta"], teamSize: 1 },
};

describe("commercial post-activation follow-up", () => {
  it("builds a deterministic versioned plan", () => {
    const first = buildCommercialPostActivationFollowUp(input);
    const second = buildCommercialPostActivationFollowUp(input);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      version: "2026-08-v1",
      key: `${input.onboardingId}:post_activation:2026-08-v1`,
      context: { activeChannels: ["meta"], teamSize: 1 },
      supportWindowEndsAt: "2026-08-27T01:01:46.809Z",
    });
  });

  it("schedules welcome, D+1, D+3, D+7 and D+14", () => {
    const plan = buildCommercialPostActivationFollowUp(input)!;
    expect(plan.milestones.map(({ code, dueAt }) => ({ code, dueAt }))).toEqual([
      { code: "welcome", dueAt: "2026-08-13T01:01:46.809Z" },
      { code: "adoption_d1", dueAt: "2026-08-14T01:01:46.809Z" },
      { code: "adoption_d3", dueAt: "2026-08-16T01:01:46.809Z" },
      { code: "adoption_d7", dueAt: "2026-08-20T01:01:46.809Z" },
      { code: "assisted_support_close_d14", dueAt: "2026-08-27T01:01:46.809Z" },
    ]);
  });

  it("assigns automated early checks and human reviews", () => {
    const plan = buildCommercialPostActivationFollowUp(input)!;
    expect(plan.milestones.slice(0, 3).every((item) => item.ownerType === "agent")).toBe(true);
    expect(plan.milestones.slice(3).every((item) => item.ownerType === "human")).toBe(true);
  });

  it("rejects invalid activation context", () => {
    expect(buildCommercialPostActivationFollowUp({
      ...input, context: { ...input.context, activeChannels: [] },
    })).toBeNull();
  });

  it("completes a milestone only when every indicator is satisfied", () => {
    const milestone = buildCommercialPostActivationFollowUp(input)!.milestones[0]!;
    expect(evaluateCommercialPostActivationMilestone(milestone, {
      welcome_delivered: true,
      support_channel_confirmed: true,
    })).toEqual({
      completed: true,
      requiresHumanEscalation: false,
      missingIndicators: [],
      activeEscalations: [],
    });
  });

  it("requests human escalation when a trigger is active", () => {
    const milestone = buildCommercialPostActivationFollowUp(input)!.milestones[1]!;
    expect(evaluateCommercialPostActivationMilestone(milestone, {
      first_login: false,
      no_login: true,
    })).toMatchObject({
      completed: false,
      requiresHumanEscalation: true,
      activeEscalations: ["no_login"],
    });
  });
});

