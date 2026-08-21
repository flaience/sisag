import { describe, expect, it, vi } from "vitest";
import { synchronizeCommercialPostActivationAlertSlaSignalOccurrences } from "./commercial-post-activation-alert-sla-signal-occurrences.service";

const signal = {
  key: "alert-1:sla_resolution_breached",
  alertKey: "alert-1",
  type: "resolution_breached" as const,
  severity: "critical" as const,
};

function store(outcomes: Array<"created" | "observed"> = ["created"]) {
  const tx = {
    upsertActive: vi.fn(),
    resolveInactive: vi.fn().mockResolvedValue(0),
  };
  outcomes.forEach((outcome) => tx.upsertActive.mockResolvedValueOnce(outcome));
  return {
    tx,
    transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

describe("commercial post-activation alert SLA signal occurrences", () => {
  it("creates newly observed signals inside one transaction", async () => {
    const storage = store();
    const now = new Date("2026-08-21T12:00:00.000Z");
    const result = await synchronizeCommercialPostActivationAlertSlaSignalOccurrences(
      { signals: [signal] },
      { store: storage, now: () => now },
    );
    expect(storage.tx.upsertActive).toHaveBeenCalledWith({ ...signal, observedAt: now });
    expect(storage.tx.resolveInactive).toHaveBeenCalledWith([signal.key], now);
    expect(result).toEqual({ ok: true, created: 1, observed: 0, resolved: 0, active: 1 });
  });

  it("distinguishes replayed observations from new occurrences", async () => {
    const storage = store(["observed"]);
    await expect(synchronizeCommercialPostActivationAlertSlaSignalOccurrences(
      { signals: [signal] }, { store: storage },
    )).resolves.toMatchObject({ ok: true, created: 0, observed: 1, active: 1 });
  });

  it("resolves occurrences missing from the active signal set", async () => {
    const storage = store([]);
    storage.tx.resolveInactive.mockResolvedValue(2);
    await expect(synchronizeCommercialPostActivationAlertSlaSignalOccurrences(
      { signals: [] }, { store: storage },
    )).resolves.toEqual({ ok: true, created: 0, observed: 0, resolved: 2, active: 0 });
    expect(storage.tx.resolveInactive).toHaveBeenCalledWith([], expect.any(Date));
  });

  it("rejects invalid signals before starting a transaction", async () => {
    const storage = store();
    const result = await synchronizeCommercialPostActivationAlertSlaSignalOccurrences({
      signals: [{ ...signal, severity: "urgent" }],
    }, { store: storage });
    expect(result).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados das ocorrências dos sinais de SLA inválidos.",
    });
    expect(storage.transaction).not.toHaveBeenCalled();
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const storage = store();
    storage.tx.upsertActive.mockReset().mockRejectedValue(failure);
    await expect(synchronizeCommercialPostActivationAlertSlaSignalOccurrences(
      { signals: [signal] }, { store: storage },
    )).rejects.toBe(failure);
  });
});
