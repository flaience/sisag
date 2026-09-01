import { describe, expect, it } from "vitest";
import { bookingReminderDedupeKey, calculateReminderRunAt } from "./BookingReminderPlanner.service";
describe("booking reminder planner", () => {
  it("calculates the configured lead time in absolute time", () => { const start = new Date("2026-09-10T15:00:00.000Z"); expect(calculateReminderRunAt(start, 24).toISOString()).toBe("2026-09-09T15:00:00.000Z"); expect(calculateReminderRunAt(start, 2).toISOString()).toBe("2026-09-10T13:00:00.000Z"); });
  it("changes idempotency only when the booking time changes", () => { const a = bookingReminderDedupeKey("booking-1", new Date("2026-09-10T15:00:00.000Z")); expect(a).toBe(bookingReminderDedupeKey("booking-1", new Date("2026-09-10T15:00:00.000Z"))); expect(a).not.toBe(bookingReminderDedupeKey("booking-1", new Date("2026-09-10T16:00:00.000Z"))); });
});
