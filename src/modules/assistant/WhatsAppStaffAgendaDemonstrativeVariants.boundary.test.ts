import fs from "node:fs";
import { describe, expect, it } from "vitest";

const query = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.ts", "utf8");
const tests = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQuery.test.ts", "utf8");

describe("WhatsApp staff agenda demonstrative variants boundary", () => {
  it("covers the real month transcription", () => {
    expect(tests).toContain("Quantos atendimentos tenho esse mês?");
    expect(query).toContain("(?:este|esse|neste|nesse) mes");
  });

  it("covers the real week transcription", () => {
    expect(tests).toContain("Como está minha agenda essa semana?");
    expect(query).toContain("(?:esta|essa|nesta|nessa) semana");
  });

  it("keeps client booking outside administrative routing", () => {
    expect(tests).toContain("Quero agendar segunda-feira às dez horas");
    expect(tests).toContain("toBeNull()");
  });
});
