import { describe, expect, it, vi } from "vitest";

import { synchronizeCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-persistence.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const now = new Date("2026-08-23T12:00:00.000Z");

function item(
  milestoneCode: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    onboardingId,
    milestoneCode,
    status: "scheduled" as const,
    dueAt: "2026-08-24T12:00:00.000Z",
    availableAt: "2026-08-24T12:00:00.000Z",
    priority: 100,
    completedAt: null,
    ...overrides,
  };
}

function stored(
  milestoneCode: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `work-${milestoneCode}`,
    milestoneCode,
    status: "scheduled",
    dueAt: "2026-08-24T12:00:00.000Z",
    availableAt: "2026-08-24T12:00:00.000Z",
    priority: 100,
    attempts: 0,
    lockedUntil: null,
    lockedBy: null,
    lastError: null,
    completedAt: null,
    ...overrides,
  };
}

function setup(existing: ReturnType<typeof stored>[] = []) {
  const tx = {
    list: vi.fn().mockResolvedValue(existing),
    insert: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
  };
  return {
    tx,
    store: {
      transaction: vi.fn(async (callback) => callback(tx)),
    },
  };
}

function projector(items = [item("welcome")]) {
  return vi.fn().mockReturnValue({
    ok: true,
    onboardingId,
    items,
  });
}

describe("commercial post-activation due work persistence", () => {
  it("creates every missing projected item transactionally", async () => {
    const options = setup();
    const project = projector([item("welcome"), item("adoption_d1")]);

    const result = await synchronizeCommercialPostActivationDueWork(
      { source: "test" },
      { store: options.store, project, now: () => now },
    );

    expect(options.tx.list).toHaveBeenCalledWith(onboardingId);
    expect(options.tx.insert).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      onboardingId,
      total: 2,
      created: 2,
      updated: 0,
      preserved: 0,
      completed: 0,
    });
  });

  it("replays an unchanged scheduled projection without writes", async () => {
    const options = setup([stored("welcome")]);
    const result = await synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: projector(),
      now: () => now,
    });

    expect(result).toMatchObject({
      ok: true,
      created: 0,
      updated: 0,
      preserved: 1,
    });
    expect(options.tx.insert).not.toHaveBeenCalled();
    expect(options.tx.update).not.toHaveBeenCalled();
  });

  it("updates safe scheduling fields before work is claimed", async () => {
    const options = setup([stored("welcome", {
      dueAt: "2026-08-23T12:00:00.000Z",
      availableAt: "2026-08-23T12:00:00.000Z",
    })]);
    await synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: projector(),
      now: () => now,
    });

    expect(options.tx.update).toHaveBeenCalledWith("work-welcome", {
      dueAt: "2026-08-24T12:00:00.000Z",
      availableAt: "2026-08-24T12:00:00.000Z",
      priority: 100,
      updatedAt: now,
    });
  });

  it("completes claimed or failed work when execution is durable", async () => {
    const options = setup([stored("welcome", {
      status: "processing",
      attempts: 1,
      lockedUntil: "2026-08-23T12:05:00.000Z",
      lockedBy: "worker-1",
    })]);
    const completed = item("welcome", {
      status: "completed",
      completedAt: "2026-08-23T11:59:00.000Z",
    });

    const result = await synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: projector([completed]),
      now: () => now,
    });

    expect(options.tx.update).toHaveBeenCalledWith("work-welcome", {
      status: "completed",
      dueAt: completed.dueAt,
      priority: 100,
      lockedUntil: null,
      lockedBy: null,
      lastError: null,
      completedAt: "2026-08-23T11:59:00.000Z",
      updatedAt: now,
    });
    expect(result).toMatchObject({ updated: 1, completed: 1 });
  });

  it.each(["processing", "failed", "completed"])(
    "preserves %s state when the source still projects scheduled work",
    async (status) => {
      const options = setup([stored("welcome", {
        status,
        ...(status === "processing"
          ? {
              lockedUntil: "2026-08-23T12:05:00.000Z",
              lockedBy: "worker-1",
            }
          : {}),
        ...(status === "completed"
          ? { completedAt: "2026-08-23T11:00:00.000Z" }
          : {}),
      })]);
      const result = await synchronizeCommercialPostActivationDueWork({}, {
        store: options.store,
        project: projector(),
      });

      expect(options.tx.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        preserved: 1,
        completed: status === "completed" ? 1 : 0,
      });
    },
  );

  it("treats a concurrent unique insert as preserved", async () => {
    const options = setup();
    options.tx.insert.mockResolvedValue(false);
    await expect(synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: projector(),
    })).resolves.toMatchObject({
      ok: true,
      created: 0,
      preserved: 1,
    });
  });

  it("returns projection failures before starting a transaction", async () => {
    const options = setup();
    const failure = {
      ok: false as const,
      error: "invalid_plan_state" as const,
      message: "inconsistent",
    };
    const result = await synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: vi.fn().mockReturnValue(failure),
    });
    expect(result).toEqual(failure);
    expect(options.store.transaction).not.toHaveBeenCalled();
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const options = setup();
    options.store.transaction.mockRejectedValue(failure);
    await expect(synchronizeCommercialPostActivationDueWork({}, {
      store: options.store,
      project: projector(),
    })).rejects.toBe(failure);
  });
});
