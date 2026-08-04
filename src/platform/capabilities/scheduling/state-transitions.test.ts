import { describe, expect, it } from "vitest";

import { getSchedulingEventDefinition } from "./events";
import { getSchedulingTransition } from "./state-transitions";

describe("scheduling reschedule semantics", () => {
  it.each([
    ["pending", "pending"],
    ["confirmed", "confirmed"],
  ] as const)("preserves %s state after rescheduling", (from, to) => {
    expect(getSchedulingTransition(from, "appointment.rescheduled")?.to).toBe(
      to,
    );
  });

  it("does not declare a single resulting state for rescheduling", () => {
    expect(
      getSchedulingEventDefinition("appointment.rescheduled")?.resultingState,
    ).toBeUndefined();
  });
});
