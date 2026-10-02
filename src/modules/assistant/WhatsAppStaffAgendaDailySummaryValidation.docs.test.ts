import fs from "node:fs";
import { describe, expect, it } from "vitest";

const doc = fs.readFileSync("docs/whatsapp-staff-agenda-daily-summary-validation.md", "utf8");
const feature = fs.readFileSync("docs/whatsapp-staff-agenda-daily-summary.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("WhatsApp staff daily agenda production validation documentation", () => {
  it("records all four successful administrative scenarios", () => {
    for (const value of ["Como está minha agenda amanhã?", "Quantos atendimentos tenho amanhã?", "Quantas consultas tenho amanhã de manhã?", "Quantos atendimentos tenho amanhã à tarde?"]) expect(doc).toContain(value);
  });

  it("records that client scheduling remains a separate intent", () => {
    expect(doc).toContain("Quero agendar amanhã às dez horas");
    expect(doc).toContain("não é confundido com consulta administrativa");
  });

  it("records that the initial pilot limit was removed by aggregate counting", () => {
    expect(doc).toContain("contagem ainda compartilhava o limite de 20 itens");
    expect(doc).toContain("contagem agregada no banco");
  });

  it("links the canonical production record from continuity documents", () => {
    for (const source of [feature, readme, plan, handoff]) expect(source).toContain("whatsapp-staff-agenda-daily-summary-validation.md");
  });
});
