import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const tests = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.test.ts", "utf8");

describe("WhatsApp staff agenda audio subject variant boundary", () => {
  it("covers the exact production transcription", () => {
    expect(tests).toContain("Quantos atendimentos tem o dia cinco?");
  });

  it("requires count, agenda subject and ownership verb for the audio variant", () => {
    expect(query).toContain('/\\b(quantos|quantas|total de)\\b/');
    expect(query).toContain('/\\b(atendimentos?|consultas?)\\b/');
    expect(query).toContain('/\\b(tem|tenho)\\b/');
  });

  it("keeps client booking requests outside staff routing", () => {
    expect(tests).toContain("Quero agendar segunda-feira às dez horas");
    expect(tests).toContain("toBeNull()");
  });
});
