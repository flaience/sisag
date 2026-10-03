import fs from "node:fs";
import { describe, expect, it } from "vitest";

const validation = fs.readFileSync("docs/whatsapp-staff-agenda-weekly-summary-validation.md", "utf8");
const feature = fs.readFileSync("docs/whatsapp-staff-agenda-weekly-summary.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("WhatsApp staff weekly agenda production validation docs", () => {
  it("records all four validated production questions", () => {
    for (const phrase of [
      "Quantos atendimentos tenho esta semana?",
      "Como está minha agenda esta semana?",
      "Quantos atendimentos tenho na próxima semana?",
      "Como está minha agenda na próxima semana à tarde?",
    ]) expect(validation).toContain(phrase);
  });

  it("records the verified production boundary without inventing response contents", () => {
    expect(validation).toContain("As quatro consultas responderam corretamente");
    expect(validation).toContain("PR #482");
    expect(validation).toContain("Nenhuma mutação de agendamento");
  });

  it("preserves authorization and calendar rules", () => {
    expect(validation).toContain("acesso persistido");
    expect(validation).toContain("segunda-feira a domingo");
    expect(validation).toContain("fuso configurado da empresa");
  });

  it("updates every continuity document", () => {
    for (const source of [feature, readme, plan, handoff]) {
      expect(source).toContain("whatsapp-staff-agenda-weekly-summary-validation.md");
    }
  });
});
