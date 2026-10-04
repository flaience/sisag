import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const resolver = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaProfessionalResolver.service.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");
const reader = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaReadModel.service.ts", "utf8");

describe("WhatsApp staff agenda professional filter boundary", () => {
  it("requires an explicit professional title or marker", () => {
    expect(query).toContain("dr|dra|doutor|doutora|profissional");
    expect(query).toContain("professionalName");
  });

  it("resolves only active professionals inside the company", () => {
    expect(resolver).toContain("eq(professionals.companyId, input.companyId)");
    expect(resolver).toContain('inArray(professionals.status, ["active", "ACTIVE"])');
  });

  it("fails closed for missing, ambiguous and cross-professional access", () => {
    expect(handler).toContain('resolution.reason === "ambiguous"');
    expect(handler).toContain("somente a sua própria agenda");
    expect(reader).toContain("input.targetProfessionalId ??");
  });
});
