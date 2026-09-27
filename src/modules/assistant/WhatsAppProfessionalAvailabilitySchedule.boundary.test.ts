import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("WhatsApp professional availability schedule boundary", () => {
  const availability = fs.readFileSync("src/modules/availability/Availability.service.ts", "utf8");
  const professionalPage = fs.readFileSync("src/app/admin/professionals/[id]/availability/page.tsx", "utf8");

  it("uses the same professional schedule configured by the admin UI", () => {
    expect(professionalPage).toContain('/schedules');
    expect(availability).toContain("professionalSchedules");
    expect(availability).toContain("professionalScheduleRows");
  });

  it("keeps additional resources on their own resource schedules", () => {
    expect(availability).toContain("resourceSchedules");
    expect(availability).toContain("isSelectedProfessionalResource");
    expect(availability).toContain("schedRows.filter");
  });

  it("scopes the professional schedule by tenant, professional, unit and weekday", () => {
    expect(availability).toContain("eq(professionalSchedules.companyId, input.companyId)");
    expect(availability).toContain("eq(professionalSchedules.professionalId, input.professionalId)");
    expect(availability).toContain("eq(professionalSchedules.unitId, input.unitId)");
    expect(availability).toContain("eq(professionalSchedules.weekday, weekday)");
  });
});
