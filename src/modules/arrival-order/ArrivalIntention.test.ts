import { describe, expect, it } from "vitest";
import { decideArrivalIntention, weekdayForAttendanceDate } from "./ArrivalIntention";

describe("arrival intention", () => {
  it("matches the concrete date to the weekly period", () => {
    expect(weekdayForAttendanceDate("2026-11-23")).toBe(1);
    expect(decideArrivalIntention({ attendanceDate: "2026-11-23", periodWeekday: 1, capacity: 30, registered: 28 })).toEqual({ accepted: true, remaining: 1 });
  });

  it("rejects a date outside the configured weekday", () => {
    expect(decideArrivalIntention({ attendanceDate: "2026-11-24", periodWeekday: 1, capacity: 30, registered: 0 })).toEqual({ accepted: false, reason: "period_weekday_mismatch" });
  });

  it("supports unlimited periods and rejects exhausted capacity", () => {
    expect(decideArrivalIntention({ attendanceDate: "2026-11-23", periodWeekday: 1, capacity: null, registered: 500 })).toEqual({ accepted: true, remaining: null });
    expect(decideArrivalIntention({ attendanceDate: "2026-11-23", periodWeekday: 1, capacity: 30, registered: 30 })).toEqual({ accepted: false, reason: "period_capacity_exhausted" });
  });
});
