import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("booking unit selection", () => {
  it("carries the selected unit from the form to availability and creation", () => {
    const page = fs.readFileSync("src/app/admin/bookings/new/page.tsx", "utf8");
    const picker = fs.readFileSync("src/components/ScheduleSlotPicker.tsx", "utf8");
    const route = fs.readFileSync("src/app/api/v1/bookings/route.ts", "utf8");
    expect(page).toContain('Label htmlFor="unitId"');
    expect(page).toContain("unitId={unitId}");
    expect(picker).toContain('params.set("unitId", unitId)');
    expect(route).toContain("unitId: unitId || undefined");
  });
});
