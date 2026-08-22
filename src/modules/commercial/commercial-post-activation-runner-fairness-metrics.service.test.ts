import { describe, expect, it } from "vitest";

import {
  projectCommercialPostActivationRunnerFairnessMetrics,
  type CommercialPostActivationRunnerFairnessMetrics,
} from "./commercial-post-activation-runner-fairness-metrics.service";

const firstCursor = "23164020-8778-4226-afed-189e8d2333cc";
const secondCursor = "33164020-8778-4226-afed-189e8d2333cc";

const input = {
  executedAt: "2026-08-22T18:00:00.000Z",
  cursor: firstCursor,
  wrapped: false,
  batchLimit: 25,
  scanned: 25,
};

function previous(
  overrides: Partial<CommercialPostActivationRunnerFairnessMetrics> = {},
): CommercialPostActivationRunnerFairnessMetrics {
  return {
    cursor: firstCursor,
    cursorAdvanced: true,
    completedCycles: 1,
    lastCycleCompletedAt: "2026-08-22T17:45:00.000Z",
    consecutiveSaturatedRunsWithoutAdvance: 0,
    status: "healthy",
    reasons: [],
    ...overrides,
  };
}

describe("commercial post-activation runner fairness metrics", () => {
  it("records cursor advancement on the first saturated batch", () => {
    expect(projectCommercialPostActivationRunnerFairnessMetrics(input)).toEqual({
      ok: true,
      metrics: {
        cursor: firstCursor,
        cursorAdvanced: true,
        completedCycles: 0,
        lastCycleCompletedAt: null,
        consecutiveSaturatedRunsWithoutAdvance: 0,
        status: "healthy",
        reasons: [],
      },
    });
  });

  it("records a completed circular scan", () => {
    const result = projectCommercialPostActivationRunnerFairnessMetrics({
      ...input,
      cursor: secondCursor,
      wrapped: true,
      scanned: 5,
      previous: previous(),
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        cursor: secondCursor,
        cursorAdvanced: true,
        completedCycles: 2,
        lastCycleCompletedAt: input.executedAt,
        status: "healthy",
      },
    });
  });

  it("marks a saturated run without cursor advancement as degraded", () => {
    const result = projectCommercialPostActivationRunnerFairnessMetrics({
      ...input,
      previous: previous(),
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        cursorAdvanced: false,
        consecutiveSaturatedRunsWithoutAdvance: 1,
        status: "degraded",
        reasons: ["saturated_without_cursor_advance"],
      },
    });
  });

  it("escalates three consecutive saturated stalls to critical", () => {
    const result = projectCommercialPostActivationRunnerFairnessMetrics({
      ...input,
      previous: previous({
        cursorAdvanced: false,
        consecutiveSaturatedRunsWithoutAdvance: 2,
        status: "degraded",
        reasons: ["saturated_without_cursor_advance"],
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        consecutiveSaturatedRunsWithoutAdvance: 3,
        status: "critical",
      },
    });
  });

  it("accepts a saturated wrap as a completed cycle", () => {
    const result = projectCommercialPostActivationRunnerFairnessMetrics({
      ...input,
      wrapped: true,
      previous: previous(),
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        cursorAdvanced: false,
        completedCycles: 2,
        consecutiveSaturatedRunsWithoutAdvance: 0,
        status: "healthy",
        reasons: [],
      },
    });
  });

  it("does not flag a small stable queue as stalled", () => {
    const result = projectCommercialPostActivationRunnerFairnessMetrics({
      ...input,
      scanned: 1,
      previous: previous(),
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        cursorAdvanced: false,
        consecutiveSaturatedRunsWithoutAdvance: 0,
        status: "healthy",
        reasons: [],
      },
    });
  });

  it.each([
    { ...input, scanned: 26 },
    { ...input, cursor: null },
    { ...input, batchLimit: 0 },
    { ...input, executedAt: "invalid" },
    {
      ...input,
      previous: {
        ...previous(),
        cursor: "invalid",
      },
    },
  ])("rejects inconsistent fairness input %#", (value) => {
    expect(projectCommercialPostActivationRunnerFairnessMetrics(value)).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados de justiça do runner pós-ativação inválidos.",
    });
  });
});
