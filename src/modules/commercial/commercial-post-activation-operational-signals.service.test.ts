import { describe, expect, it } from "vitest";

import { evaluateCommercialPostActivationOperationalSignals } from "./commercial-post-activation-operational-signals.service";

const snapshot = {
  hasSchedulingConfiguration: true,
  activeChannelCount: 1,
  appointmentsSinceActivation: 4,
  appointmentsLast7Days: 4,
  activeProfessionalCount: 2,
  professionalsWithAppointments: 2,
  outboundMessageCount: 20,
  failedMessageCount: 1,
};

describe("commercial post-activation operational signals", () => {
  it("derives only objective D1 operational signals", () => {
    expect(evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d1",
      expectedTeamSize: 2,
      snapshot,
    })).toEqual({
      ok: true,
      signals: {
        scheduling_activity: true,
        active_channel_health: true,
      },
    });
  });

  it("does not infer first login without an authentication source", () => {
    const result = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d1",
      expectedTeamSize: 2,
      snapshot,
    });
    expect(result.ok && result.signals).not.toHaveProperty("first_login");
  });

  it("derives D3 activity and reliable delivery", () => {
    expect(evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d3",
      expectedTeamSize: 2,
      snapshot,
    })).toEqual({
      ok: true,
      signals: {
        appointments_created: true,
        team_activity: true,
        channel_delivery_rate: true,
      },
    });
  });

  it("requires a meaningful sample before confirming delivery rate", () => {
    const result = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d3",
      expectedTeamSize: 2,
      snapshot: { ...snapshot, outboundMessageCount: 4, failedMessageCount: 0 },
    });
    expect(result).toEqual({
      ok: true,
      signals: { appointments_created: true, team_activity: true },
    });
  });

  it("does not confirm an unhealthy delivery rate", () => {
    const result = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d3",
      expectedTeamSize: 2,
      snapshot: { ...snapshot, outboundMessageCount: 10, failedMessageCount: 2 },
    });
    expect(result.ok && result.signals).not.toHaveProperty("channel_delivery_rate");
  });

  it("derives D7 scheduling volume and team adoption", () => {
    expect(evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d7",
      expectedTeamSize: 2,
      snapshot,
    })).toEqual({
      ok: true,
      signals: {
        weekly_scheduling_volume: true,
        team_adoption: true,
      },
    });
  });

  it("does not infer support or final human acknowledgements", () => {
    const d7 = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d7",
      expectedTeamSize: 2,
      snapshot,
    });
    const d14 = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "assisted_support_close_d14",
      expectedTeamSize: 2,
      snapshot,
    });
    expect(d7.ok && d7.signals).not.toHaveProperty("support_requests");
    expect(d14).toEqual({ ok: true, signals: {} });
  });

  it("keeps absent evidence unknown instead of emitting false", () => {
    const result = evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d1",
      expectedTeamSize: 2,
      snapshot: {
        ...snapshot,
        hasSchedulingConfiguration: false,
        activeChannelCount: 0,
        appointmentsSinceActivation: 0,
      },
    });
    expect(result).toEqual({ ok: true, signals: {} });
  });

  it("rejects invalid and internally inconsistent metrics", () => {
    expect(evaluateCommercialPostActivationOperationalSignals({
      milestoneCode: "adoption_d3",
      expectedTeamSize: 2,
      snapshot: { ...snapshot, failedMessageCount: -1 },
    })).toMatchObject({ ok: false, error: "invalid_input" });
  });
});
