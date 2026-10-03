import fs from "node:fs";
import { describe, expect, it } from "vitest";

const validation = fs.readFileSync("docs/whatsapp-staff-agenda-specific-date-validation.md", "utf8");
const feature = fs.readFileSync("docs/whatsapp-staff-agenda-specific-date.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("WhatsApp staff agenda specific date production validation docs", () => {
  it("records the exact production transcript and successful answer", () => {
    expect(validation).toContain("Quantos atendimentos tem o dia cinco?");
    expect(validation).toContain("Há 1 atendimento na agenda dia 05/10/2026");
    expect(validation).toContain("PR #480");
  });

  it("records the separation from client booking", () => {
    expect(validation).toContain("Quero agendar segunda-feira às dez horas");
    expect(validation).toContain("novo agendamento foi confirmado normalmente");
  });

  it("keeps the remaining weekly interval limit explicit", () => {
    expect(validation).toContain("esta semana");
    expect(validation).toContain("próxima semana");
  });

  it("updates all continuity documents", () => {
    for (const source of [feature, readme, plan, handoff]) {
      expect(source).toContain("whatsapp-staff-agenda-specific-date-validation.md");
    }
  });
});
