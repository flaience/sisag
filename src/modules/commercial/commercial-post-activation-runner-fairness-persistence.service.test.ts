import { describe, expect, it, vi } from "vitest";

import { persistCommercialPostActivationRunnerFairness } from "./commercial-post-activation-runner-fairness-persistence.service";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  runnerKey: "post_activation_due_runner",
  executionKey: "n8n-execution-901",
  executedAt: "2026-08-22T18:00:00.000Z",
  cursor,
  wrapped: false,
  batchLimit: 25,
  scanned: 25,
};

const fairness = {
  cursor,
  cursorAdvanced: true,
  completedCycles: 2,
  lastCycleCompletedAt: "2026-08-22T17:45:00.000Z",
  consecutiveSaturatedRunsWithoutAdvance: 0,
  status: "healthy" as const,
  reasons: [],
};

function store(existing: { fairness: unknown | null } | null = { fairness: null }) {
  return {
    findExecution: vi.fn().mockResolvedValue(existing),
    findLatest: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(true),
  };
}

describe("commercial post-activation runner fairness persistence", () => {
  it("attaches projected fairness to an existing execution", async () => {
    const storage = store();
    const previous = { ...fairness, completedCycles: 1 };
    storage.findLatest.mockResolvedValue({ fairness: previous });
    const project = vi.fn().mockReturnValue({ ok: true, metrics: fairness });
    const recordedAt = new Date("2026-08-22T18:00:01.000Z");

    const result = await persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
      project,
      now: () => recordedAt,
    });

    expect(project).toHaveBeenCalledWith({
      executedAt: input.executedAt,
      cursor,
      wrapped: false,
      batchLimit: 25,
      scanned: 25,
      previous,
    });
    expect(storage.save).toHaveBeenCalledWith({
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
      recordedAt,
    });
    expect(result).toEqual({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
    });
  });

  it("projects the first fairness snapshot without previous state", async () => {
    const storage = store();
    const project = vi.fn().mockReturnValue({ ok: true, metrics: fairness });

    await persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
      project,
    });

    expect(project).toHaveBeenCalledWith({
      executedAt: input.executedAt,
      cursor,
      wrapped: false,
      batchLimit: 25,
      scanned: 25,
    });
  });

  it("replays an already recorded fairness snapshot", async () => {
    const storage = store({ fairness });
    const project = vi.fn();
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
      project,
    })).resolves.toEqual({
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
    });
    expect(storage.findLatest).not.toHaveBeenCalled();
    expect(project).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("returns a controlled error when the execution does not exist", async () => {
    const storage = store(null);
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
    })).resolves.toMatchObject({
      ok: false,
      error: "execution_not_found",
    });
    expect(storage.findLatest).not.toHaveBeenCalled();
  });

  it("rejects malformed input before accessing storage", async () => {
    const storage = store();
    await expect(persistCommercialPostActivationRunnerFairness({
      ...input,
      cursor: "invalid",
    }, { store: storage })).resolves.toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(storage.findExecution).not.toHaveBeenCalled();
  });

  it("rejects invalid current or previous durable metrics", async () => {
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: store({ fairness: { status: "unknown" } }),
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_stored_fairness",
    });

    const storage = store();
    storage.findLatest.mockResolvedValue({ fairness: { status: "unknown" } });
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_stored_fairness",
    });
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("forwards projection validation failures", async () => {
    const storage = store();
    const failure = {
      ok: false as const,
      error: "invalid_input" as const,
      message: "Dados de justiça do runner pós-ativação inválidos.",
    };
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
      project: vi.fn().mockReturnValue(failure),
    })).resolves.toEqual(failure);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("recovers an idempotent concurrent update", async () => {
    const storage = store();
    storage.findExecution
      .mockResolvedValueOnce({ fairness: null })
      .mockResolvedValueOnce({ fairness });
    storage.save.mockResolvedValue(false);
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
      project: vi.fn().mockReturnValue({ ok: true, metrics: fairness }),
    })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      fairness,
    });
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const storage = store();
    storage.findExecution.mockRejectedValue(failure);
    await expect(persistCommercialPostActivationRunnerFairness(input, {
      store: storage,
    })).rejects.toBe(failure);
  });
});
