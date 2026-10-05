import fs from "node:fs";
import { describe, expect, it } from "vitest";

const doc = fs.readFileSync("docs/whatsapp-staff-agenda-professional-filter-validation.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");
const foundation = fs.readFileSync("docs/whatsapp-staff-agenda-professional-filter.md", "utf8");
const phrases = fs.readFileSync("docs/whatsapp-staff-agenda-professional-production-phrases.md", "utf8");

describe("WhatsApp staff agenda professional filter production validation docs", () => {
  it("records the successful production resolution", () => {
    expect(doc).toContain("profissional teste");
    expect(doc).toContain("não havia agendamentos para amanhã");
    expect(doc).toContain("PRs #489 e #490");
  });

  it("records fail-closed behavior for unknown names", () => {
    expect(doc).toContain("profissional testes");
    expect(doc).toContain("Dra. Fulana");
    expect(doc).toContain("não substitui silenciosamente");
  });

  it("preserves the security boundary", () => {
    for (const value of ["somente leitura", "isolada por empresa", "profissionais ativos", "bookings oficiais"]) {
      expect(doc).toContain(value);
    }
  });

  it("updates all continuity documents", () => {
    for (const source of [readme, plan, handoff, foundation, phrases]) {
      expect(source).toContain("whatsapp-staff-agenda-professional-filter-validation.md");
    }
  });
});
