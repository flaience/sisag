import { describe, expect, it } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { projectCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-projection.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";

function plan() {
  return buildCommercialPostActivationFollowUp({
    onboardingId,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
    activatedAt: "2026-08-13T01:00:00.000Z",
    context: {
      businessType: "clinic",
      activeChannels: ["meta"],
      teamSize: 1,
    },
  })!;
}

describe("commercial post-activation due work projection", () => {
  it("projects every milestone as indexed scheduled work", () => {
    const result = projectCommercialPostActivationDueWork({
      onboardingId,
      plan: plan(),
      executions: [],
    });

    expect(result).toMatchObject({
      ok: true,
      onboardingId,
    });
    if (result.ok) {
      expect(result.items[0]).toEqual({
        onboardingId,
        milestoneCode: "welcome",
        status: "scheduled",
        dueAt: "2026-08-13T01:00:00.000Z",
        availableAt: "2026-08-13T01:00:00.000Z",
        priority: 100,
        completedAt: null,
      });
      expect(result.items).toHaveLength(5);
      expect(result.items.map((item) => item.milestoneCode)).toEqual([
        "welcome",
        "adoption_d1",
        "adoption_d3",
        "adoption_d7",
        "assisted_support_close_d14",
      ]);
    }
  });

  it("projects processed milestones as completed work", () => {
    const result = projectCommercialPostActivationDueWork({
      onboardingId,
      plan: plan(),
      executions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0]).toMatchObject({
        milestoneCode: "welcome",
        status: "completed",
        completedAt: "2026-08-13T02:00:00.000Z",
      });
    }
  });

  it("treats escalated milestone executions as consumed work", () => {
    const result = projectCommercialPostActivationDueWork({
      onboardingId,
      plan: plan(),
      executions: [{
        milestoneCode: "welcome",
        outcome: "escalated",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0]).toMatchObject({ status: "completed" });
    }
  });

  it("orders work deterministically by due date and code", () => {
    const reversed = plan();
    reversed.milestones.reverse();
    const result = projectCommercialPostActivationDueWork({
      onboardingId,
      plan: reversed,
    });

    if (result.ok) {
      expect(result.items[0]?.milestoneCode).toBe("welcome");
      expect(result.items.at(-1)?.milestoneCode)
        .toBe("assisted_support_close_d14");
    }
  });

  it("rejects a plan belonging to another onboarding", () => {
    const invalid = plan();
    invalid.onboardingId = "33164020-8778-4226-afed-189e8d2333cc";
    expect(projectCommercialPostActivationDueWork({
      onboardingId,
      plan: invalid,
    })).toMatchObject({
      ok: false,
      error: "invalid_plan_state",
    });
  });

  it.each([
    {
      mutate: (value: ReturnType<typeof plan>) => {
        value.milestones.push({ ...value.milestones[0]! });
      },
      executions: undefined,
    },
    {
      mutate: undefined,
      executions: [
        {
          milestoneCode: "unknown",
          outcome: "completed",
          processedAt: "2026-08-13T02:00:00.000Z",
        },
      ],
    },
    {
      mutate: undefined,
      executions: [
        {
          milestoneCode: "welcome",
          outcome: "completed",
          processedAt: "2026-08-13T02:00:00.000Z",
        },
        {
          milestoneCode: "welcome",
          outcome: "escalated",
          processedAt: "2026-08-13T03:00:00.000Z",
        },
      ],
    },
  ])("rejects inconsistent plan state %#", ({ mutate, executions }) => {
    const value = plan();
    mutate?.(value);
    expect(projectCommercialPostActivationDueWork({
      onboardingId,
      plan: value,
      executions,
    })).toMatchObject({
      ok: false,
      error: "invalid_plan_state",
    });
  });

  it("rejects malformed projection input", () => {
    expect(projectCommercialPostActivationDueWork({
      onboardingId: "invalid",
      plan: {},
    })).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados para projeção dos trabalhos pós-ativação inválidos.",
    });
  });
});
