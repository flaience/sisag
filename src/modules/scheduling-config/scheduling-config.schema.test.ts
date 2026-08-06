import { describe, expect, it } from "vitest";

import { SchedulingConfigInputSchema } from "./scheduling-config.schema";

describe("SchedulingConfigInputSchema", () => {
  const valid = {
    slotDurationMinutes: 15,
    bufferMinutes: 5,
    allowOverbooking: false,
    maxAdvanceDays: 90,
    minCancelAdvanceMinutes: 120,
  };

  it("accepts a complete operational configuration", () => {
    expect(SchedulingConfigInputSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    ["slotDurationMinutes", 0],
    ["bufferMinutes", -1],
    ["maxAdvanceDays", 0],
    ["minCancelAdvanceMinutes", -1],
  ])("rejects an invalid %s", (field, value) => {
    expect(() =>
      SchedulingConfigInputSchema.parse({ ...valid, [field]: value }),
    ).toThrow();
  });

  it("requires an explicit overbooking policy", () => {
    const { allowOverbooking: _removed, ...input } = valid;
    expect(() => SchedulingConfigInputSchema.parse(input)).toThrow();
  });
});
