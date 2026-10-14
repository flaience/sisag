import { describe, expect, it } from "vitest";
import { scheduleAllowsSlot, schedulesForSlotWeekday } from "./Availability.service";
const timezone = "America/Sao_Paulo";
const rows = [
  { weekday: 1, startTime: "08:00", endTime: "12:00" },
  { weekday: 1, startTime: "13:05", endTime: "17:05" },
];
describe("multi-day availability weekday selection", () => {
  it("finds Monday availability when a range starts on Wednesday", () => { const monday = new Date("2026-10-19T11:00:00.000Z"); const selected = schedulesForSlotWeekday(rows, monday, timezone); expect(selected).toHaveLength(2); expect(scheduleAllowsSlot(selected, monday, new Date("2026-10-19T11:30:00.000Z"), timezone)).toBe(true); });
  it("does not reuse Monday availability on Wednesday", () => { const wednesday = new Date("2026-10-14T11:00:00.000Z"); expect(schedulesForSlotWeekday(rows, wednesday, timezone)).toEqual([]); });
  it("preserves the afternoon window with its non-round start", () => { const monday = new Date("2026-10-19T16:05:00.000Z"); const selected = schedulesForSlotWeekday(rows, monday, timezone); expect(scheduleAllowsSlot(selected, monday, new Date("2026-10-19T16:35:00.000Z"), timezone)).toBe(true); });
});
