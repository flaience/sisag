import { describe, expect, it } from "vitest";
import { scheduleAllowsSlot } from "./Availability.service";

describe("professional schedule availability", () => {
  const timezone = "America/Sao_Paulo";
  const mondayWindow = [{ startTime: "08:00", endTime: "12:00" }];

  it("accepts a complete slot inside the professional schedule", () => {
    expect(scheduleAllowsSlot(mondayWindow, new Date("2026-09-28T13:00:00.000Z"), new Date("2026-09-28T13:30:00.000Z"), timezone)).toBe(true);
  });

  it("rejects a slot that ends outside the professional schedule", () => {
    expect(scheduleAllowsSlot(mondayWindow, new Date("2026-09-28T14:45:00.000Z"), new Date("2026-09-28T15:15:00.000Z"), timezone)).toBe(false);
  });

  it("rejects a resource without a schedule", () => {
    expect(scheduleAllowsSlot([], new Date("2026-09-28T13:00:00.000Z"), new Date("2026-09-28T13:30:00.000Z"), timezone)).toBe(false);
  });
});
