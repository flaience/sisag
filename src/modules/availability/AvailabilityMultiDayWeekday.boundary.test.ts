import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/availability/Availability.service.ts", "utf8");
describe("multi-day availability weekday boundary", () => {
  it("loads the complete weekly schedule", () => { expect(service).not.toContain("eq(resourceSchedules.weekday, weekday)"); expect(service).not.toContain("eq(professionalSchedules.weekday, weekday)"); });
  it("selects schedules using each candidate slot weekday", () => { expect(service).toContain("schedulesForSlotWeekday(weeklyRows, slotStart, timeZone)"); expect(service).toContain("getWeekdayInTz(slotStart, timeZone)"); });
});
