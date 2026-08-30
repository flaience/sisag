import { describe, expect, it } from "vitest";
import { chooseBookingUnitCandidate } from "./BookingUnit.resolver";

describe("booking unit resolution", () => {
  it("prefers the professional primary unit", () => {
    expect(chooseBookingUnitCandidate([
      { unitId: "secondary", isPrimary: false },
      { unitId: "primary", isPrimary: true },
    ])).toBe("primary");
  });

  it("prefers the company default and reports an empty resolution", () => {
    expect(chooseBookingUnitCandidate([
      { unitId: "older", isDefault: false },
      { unitId: "default", isDefault: true },
    ])).toBe("default");
    expect(chooseBookingUnitCandidate([])).toBeNull();
  });
});
