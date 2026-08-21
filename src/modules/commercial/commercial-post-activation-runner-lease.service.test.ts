import { describe, expect, it, vi } from "vitest";

import {
  acquireCommercialPostActivationRunnerLease,
  releaseCommercialPostActivationRunnerLease,
  renewCommercialPostActivationRunnerLease,
} from "./commercial-post-activation-runner-lease.service";

const runnerKey = "post_activation_due_runner";
const ownerKey = "n8n-execution-401";
const now = new Date("2026-08-21T15:00:00.000Z");

function store() {
  return {
    acquire: vi.fn().mockResolvedValue(true),
    renew: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(true),
  };
}

describe("commercial post-activation runner lease", () => {
  it("acquires a bounded lease", async () => {
    const storage = store();
    const result = await acquireCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey, ttlSeconds: 600 },
      { store: storage, now: () => now },
    );

    const expiresAt = new Date("2026-08-21T15:10:00.000Z");
    expect(storage.acquire).toHaveBeenCalledWith({
      runnerKey,
      ownerKey,
      acquiredAt: now,
      expiresAt,
    });
    expect(result).toEqual({
      ok: true,
      acquired: true,
      runnerKey,
      ownerKey,
      expiresAt: expiresAt.toISOString(),
    });
  });

  it("reports contention without exposing another owner", async () => {
    const storage = store();
    storage.acquire.mockResolvedValue(false);

    await expect(acquireCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey },
      { store: storage, now: () => now },
    )).resolves.toEqual({
      ok: true,
      acquired: false,
      runnerKey,
    });
  });

  it("renews only the current owner's unexpired lease", async () => {
    const storage = store();
    const result = await renewCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey, ttlSeconds: 300 },
      { store: storage, now: () => now },
    );

    const expiresAt = new Date("2026-08-21T15:05:00.000Z");
    expect(storage.renew).toHaveBeenCalledWith({ runnerKey, ownerKey, now, expiresAt });
    expect(result).toEqual({
      ok: true,
      renewed: true,
      runnerKey,
      ownerKey,
      expiresAt: expiresAt.toISOString(),
    });
  });

  it("reports a lease that can no longer be renewed", async () => {
    const storage = store();
    storage.renew.mockResolvedValue(false);
    await expect(renewCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey },
      { store: storage, now: () => now },
    )).resolves.toEqual({ ok: true, renewed: false, runnerKey });
  });

  it("releases only a lease owned by the execution", async () => {
    const storage = store();
    await expect(releaseCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey },
      { store: storage },
    )).resolves.toEqual({ ok: true, released: true, runnerKey });
    expect(storage.release).toHaveBeenCalledWith({ runnerKey, ownerKey });
  });

  it("rejects invalid input before accessing storage", async () => {
    const storage = store();
    await expect(acquireCommercialPostActivationRunnerLease(
      { runnerKey: "Invalid Runner", ownerKey },
      { store: storage },
    )).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(storage.acquire).not.toHaveBeenCalled();
  });

  it("bounds the lease lifetime", async () => {
    const storage = store();
    await expect(acquireCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey, ttlSeconds: 3601 },
      { store: storage },
    )).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(storage.acquire).not.toHaveBeenCalled();
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const storage = store();
    storage.acquire.mockRejectedValue(failure);
    await expect(acquireCommercialPostActivationRunnerLease(
      { runnerKey, ownerKey },
      { store: storage },
    )).rejects.toBe(failure);
  });
});
