import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/service-assignments/page.tsx", "utf8");

describe("service booking assignment availability validation", () => {
  it("loads the selected professional schedules and blocks uncovered turns", () => {
    for (const value of ["/schedules", "isAssignmentCoveredByProfessionalSchedule", "!availabilityCovered", "não cobre este turno", "cubra completamente este turno"]) expect(page).toContain(value);
  });

  it("keeps a direct recovery path to professional availability", () => {
    expect(page).toContain("Configurar horários deste profissional");
    expect(page).toContain("/availability");
  });
});
