import { describe, expect, it, vi } from "vitest";

import { persistCommercialPostActivationRunnerCapacity } from "./commercial-post-activation-runner-capacity-persistence.service";

const input = {
  runnerKey: "post_activation_due_runner",
  executionKey: "n8n-execution-601",
  startedAt: "2026-08-21T18:00:00.000Z",
  finishedAt: "2026-08-21T18:01:00.000Z",
  scheduleIntervalSeconds: 900,
  targetDurationSeconds: 300,
  batchLimit: 25,
  scanned: 10,
  due: 4,
  processed: 4,
  failed: 0,
};

const capacity = {
  durationMilliseconds: 60000,
  durationSeconds: 60,
  scheduleIntervalSeconds: 900,
  targetDurationSeconds: 300,
  batchLimit: 25,
  scanned: 10,
  due: 4,
  processed: 4,
  failed: 0,
  batchUtilizationPercent: 40,
  processedPerMinute: 4,
  possibleBacklog: false,
  status: "healthy" as const,
  reasons: [],
};

function store(existing: { capacity: unknown | null } | null = { capacity: null }) {
  return {
    find: vi.fn().mockResolvedValue(existing),
    save: vi.fn().mockResolvedValue(true),
  };
}

describe("commercial post-activation runner capacity persistence", () => {
  it("attaches projected capacity to an existing runner execution", async () => {
    const storage = store();
    const recordedAt = new Date("2026-08-21T18:01:01.000Z");
    const project = vi.fn().mockReturnValue({ ok: true, metrics: capacity });

    const result = await persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
      project,
      now: () => recordedAt,
    });

    expect(project).toHaveBeenCalledWith({
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      scheduleIntervalSeconds: 900,
      targetDurationSeconds: 300,
      batchLimit: 25,
      scanned: 10,
      due: 4,
      processed: 4,
      failed: 0,
    });
    expect(storage.save).toHaveBeenCalledWith({
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity,
      recordedAt,
    });
    expect(result).toEqual({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity,
    });
  });

  it("replays an already recorded capacity snapshot", async () => {
    const storage = store({ capacity });
    const project = vi.fn();
    const result = await persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
      project,
    });

    expect(result).toEqual({
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity,
    });
    expect(project).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("returns a controlled error when the execution does not exist", async () => {
    const storage = store(null);
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
    })).resolves.toEqual({
      ok: false,
      error: "execution_not_found",
      message: "A execução do runner não foi encontrada para registrar capacidade.",
    });
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("rejects malformed input before accessing storage", async () => {
    const storage = store();
    await expect(persistCommercialPostActivationRunnerCapacity({
      ...input,
      executionKey: "",
    }, { store: storage })).resolves.toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(storage.find).not.toHaveBeenCalled();
  });

  it("rejects an invalid stored capacity snapshot", async () => {
    const storage = store({ capacity: { ...capacity, status: "unknown" } });
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
    })).resolves.toEqual({
      ok: false,
      error: "invalid_stored_capacity",
      message: "As métricas de capacidade persistidas são inválidas.",
    });
  });

  it("forwards projection validation failures", async () => {
    const storage = store();
    const failure = {
      ok: false as const,
      error: "invalid_input" as const,
      message: "Dados de capacidade do runner pós-ativação inválidos.",
    };
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
      project: vi.fn().mockReturnValue(failure),
    })).resolves.toEqual(failure);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("replays a capacity snapshot written by a concurrent request", async () => {
    const storage = store();
    storage.find
      .mockResolvedValueOnce({ capacity: null })
      .mockResolvedValueOnce({ capacity });
    storage.save.mockResolvedValue(false);
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
      project: vi.fn().mockReturnValue({ ok: true, metrics: capacity }),
    })).resolves.toEqual({
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity,
    });
  });

  it("reports a capacity update that cannot be confirmed", async () => {
    const storage = store();
    storage.save.mockResolvedValue(false);
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
      project: vi.fn().mockReturnValue({ ok: true, metrics: capacity }),
    })).resolves.toEqual({
      ok: false,
      error: "persistence_conflict",
      message: "Não foi possível confirmar as métricas de capacidade do runner.",
    });
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const storage = store();
    storage.find.mockRejectedValue(failure);
    await expect(persistCommercialPostActivationRunnerCapacity(input, {
      store: storage,
    })).rejects.toBe(failure);
  });
});
