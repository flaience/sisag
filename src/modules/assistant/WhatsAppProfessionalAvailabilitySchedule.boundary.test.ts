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

  it("keeps legacy resource schedules only as fallback", () => {
    expect(availability).toContain("resourceSchedules");
    expect(availability).toContain("legacyResourceRows");
    expect(availability).toContain("preferredSchedulesForResource(linkedProfessionalRows, legacyResourceRows)");
  });

  it("scopes linked professional schedules by tenant, candidate resources and optional selections, then selects each slot weekday", () => {
    expect(availability).toContain("eq(professionalSchedules.companyId, input.companyId)");
    expect(availability).toContain("inArray(professionals.resourceId, candidateIds)");
    expect(availability).toContain("input.professionalId ? eq(professionals.id, input.professionalId)");
    expect(availability).toContain("input.unitId ? eq(professionalSchedules.unitId, input.unitId)");
    expect(availability).toContain("schedulesForSlotWeekday(weeklyRows, slotStart, timeZone)");
    expect(availability).toContain("getWeekdayInTz(slotStart, timeZone)");
  });
});
