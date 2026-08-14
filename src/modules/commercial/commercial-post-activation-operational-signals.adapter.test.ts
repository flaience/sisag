import { describe, expect, it, vi } from "vitest";

import { readCommercialPostActivationOperationalSnapshot } from "./commercial-post-activation-operational-signals.adapter";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const activatedAt = "2026-08-10T12:00:00.000Z";
const snapshot = {
  hasSchedulingConfiguration: true,
  activeChannelCount: 1,
  appointmentsSinceActivation: 3,
  appointmentsLast7Days: 3,
  activeProfessionalCount: 2,
  professionalsWithAppointments: 1,
  outboundMessageCount: 10,
  failedMessageCount: 0,
};

describe("commercial post-activation operational signals adapter", () => {
  it("loads a typed operational snapshot", async () => {
    const store = { read: vi.fn().mockResolvedValue(snapshot) };
    await expect(readCommercialPostActivationOperationalSnapshot({
      companyId,
      activatedAt,
    }, {
      store,
      now: () => new Date("2026-08-14T12:00:00.000Z"),
    })).resolves.toEqual({ ok: true, snapshot });
  });

  it("uses activation as the weekly boundary for a recent activation", async () => {
    const store = { read: vi.fn().mockResolvedValue(snapshot) };
    await readCommercialPostActivationOperationalSnapshot({
      companyId,
      activatedAt,
    }, {
      store,
      now: () => new Date("2026-08-14T12:00:00.000Z"),
    });

    expect(store.read).toHaveBeenCalledWith({
      companyId,
      activatedAt: new Date(activatedAt),
      weeklyWindowStartedAt: new Date(activatedAt),
    });
  });

  it("uses the last seven days for an older activation", async () => {
    const store = { read: vi.fn().mockResolvedValue(snapshot) };
    await readCommercialPostActivationOperationalSnapshot({
      companyId,
      activatedAt: "2026-07-01T12:00:00.000Z",
    }, {
      store,
      now: () => new Date("2026-08-14T12:00:00.000Z"),
    });

    expect(store.read).toHaveBeenCalledWith(expect.objectContaining({
      weeklyWindowStartedAt: new Date("2026-08-07T12:00:00.000Z"),
    }));
  });

  it("preserves zero metrics without inventing activity", async () => {
    const emptySnapshot = {
      hasSchedulingConfiguration: false,
      activeChannelCount: 0,
      appointmentsSinceActivation: 0,
      appointmentsLast7Days: 0,
      activeProfessionalCount: 0,
      professionalsWithAppointments: 0,
      outboundMessageCount: 0,
      failedMessageCount: 0,
    };
    const store = { read: vi.fn().mockResolvedValue(emptySnapshot) };
    await expect(readCommercialPostActivationOperationalSnapshot({
      companyId,
      activatedAt,
    }, { store })).resolves.toEqual({ ok: true, snapshot: emptySnapshot });
  });

  it("rejects an invalid company before querying", async () => {
    const store = { read: vi.fn() };
    await expect(readCommercialPostActivationOperationalSnapshot({
      companyId: "invalid",
      activatedAt,
    }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.read).not.toHaveBeenCalled();
  });

  it("rejects an invalid activation date before querying", async () => {
    const store = { read: vi.fn() };
    await expect(readCommercialPostActivationOperationalSnapshot({
      companyId,
      activatedAt: "invalid",
    }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.read).not.toHaveBeenCalled();
  });
});
