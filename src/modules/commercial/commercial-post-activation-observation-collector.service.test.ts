import { describe, expect, it } from "vitest";

import { collectCommercialPostActivationObservations } from "./commercial-post-activation-observation-collector.service";

function observation(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: "observation-1",
    milestoneCode: "welcome",
    indicator: "welcome_delivered",
    value: true,
    observedAt: "2026-08-14T10:00:00.000Z",
    source: { type: "system", id: "test" },
    ...overrides,
  };
}

describe("commercial post-activation observation collector", () => {
  it("collects only observations from the requested milestone", () => {
    expect(collectCommercialPostActivationObservations([
      observation(),
      observation({
        idempotencyKey: "observation-2",
        milestoneCode: "adoption_d1",
        indicator: "first_login",
      }),
    ], "welcome")).toEqual({
      ok: true,
      observations: { welcome_delivered: true },
      observationCount: 1,
    });
  });

  it("uses the latest observation for a repeated indicator", () => {
    const result = collectCommercialPostActivationObservations([
      observation({ idempotencyKey: "newer", value: true, observedAt: "2026-08-14T12:00:00.000Z" }),
      observation({ idempotencyKey: "older", value: false, observedAt: "2026-08-14T09:00:00.000Z" }),
    ], "welcome");

    expect(result).toEqual({
      ok: true,
      observations: { welcome_delivered: true },
      observationCount: 2,
    });
  });

  it("uses insertion order when observations share the same timestamp", () => {
    const result = collectCommercialPostActivationObservations([
      observation({ idempotencyKey: "first", value: false }),
      observation({ idempotencyKey: "second", value: true }),
    ], "welcome");

    expect(result).toMatchObject({
      ok: true,
      observations: { welcome_delivered: true },
    });
  });

  it("returns an empty map when the milestone has no observations", () => {
    expect(collectCommercialPostActivationObservations([], "adoption_d3")).toEqual({
      ok: true,
      observations: {},
      observationCount: 0,
    });
  });

  it("rejects a malformed history", () => {
    expect(collectCommercialPostActivationObservations([
      { indicator: "missing-fields" },
    ], "welcome")).toMatchObject({
      ok: false,
      error: "invalid_observation_history",
    });
  });

  it("rejects an unsupported milestone", () => {
    expect(collectCommercialPostActivationObservations([], "unknown")).toMatchObject({
      ok: false,
      error: "invalid_observation_history",
    });
  });

  it("accepts an absent history as empty", () => {
    expect(collectCommercialPostActivationObservations(undefined, "welcome")).toEqual({
      ok: true,
      observations: {},
      observationCount: 0,
    });
  });
});
