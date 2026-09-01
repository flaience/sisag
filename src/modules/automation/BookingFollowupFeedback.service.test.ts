import { describe, expect, it } from "vitest"; import { readFollowupScore } from "./BookingFollowupFeedback.service";
describe("booking follow-up feedback", () => { it("accepts only an explicit score", () => { expect(readFollowupScore("1")).toBe(1); expect(readFollowupScore(" 5 ")).toBe(5); expect(readFollowupScore("nota 5")).toBeNull(); expect(readFollowupScore("10")).toBeNull(); }); });
