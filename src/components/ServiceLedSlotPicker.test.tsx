import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("service-led slot picker", () => { it("keeps the professional identity attached to the selected time", () => { const source = fs.readFileSync("src/components/ServiceLedSlotPicker.tsx", "utf8"); expect(source).toContain("professionalId: slot.professionalId"); expect(source).toContain("professionalName: slot.professionalName"); expect(source).toContain("/api/v1/scheduling/service-available?"); }); });
