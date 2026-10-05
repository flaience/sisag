import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const handler = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts", "utf8");
const tests = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.test.ts", "utf8");

describe("WhatsApp staff agenda professional production phrases boundary", () => {
  it("covers agendamento as an administrative synonym", () => {
    expect(query).toContain("agendamentos (?:eu )?tenho");
    expect(query).toContain("agendamentos?");
    expect(tests).toContain("Quantos agendamentos o profissional teste tem amanhã?");
  });

  it("makes the applied professional filter visible in replies", () => {
    expect(handler).toContain("targetProfessionalName");
    expect(handler).toContain('" de " + model.targetProfessionalName');
  });

  it("does not change the conservative delivery_unknown contract", () => {
    expect(handler).not.toContain("delivery_unknown");
    expect(handler).not.toContain("retry");
  });
});
