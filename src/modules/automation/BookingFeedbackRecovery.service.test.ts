import { describe, expect, it } from "vitest"; import { recoveryPriority } from "./BookingFeedbackRecovery.service";
describe("booking feedback recovery", () => { it("classifies critical scores", () => { expect(recoveryPriority(1)).toBe("urgent"); expect(recoveryPriority(2)).toBe("high"); expect(recoveryPriority(3)).toBeNull(); expect(recoveryPriority(5)).toBeNull(); }); });
