import fs from "node:fs";
import { describe, expect, it } from "vitest";

const validation = fs.readFileSync("docs/whatsapp-staff-agenda-monthly-summary-validation.md", "utf8");
const monthly = fs.readFileSync("docs/whatsapp-staff-agenda-monthly-summary.md", "utf8");
const variants = fs.readFileSync("docs/whatsapp-staff-agenda-demonstrative-variants.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("WhatsApp staff monthly agenda production validation docs", () => {
  it("records successful monthly production scenarios", () => {
    expect(validation).toContain("Como está minha agenda no próximo mês?");
    expect(validation).toContain("Quantos atendimentos eu tenho em outubro?");
    expect(validation).toContain("Quantos atendimentos eu tenho em outubro à tarde?");
  });

  it("records the exact failure, diagnosis and successful retests", () => {
    expect(validation).toContain("Quantos atendimentos tenho esse mês?");
    expect(validation).toContain("respondeu incorretamente sobre hoje");
    expect(validation).toContain("Como está minha agenda essa semana?");
    expect(validation).toContain("responderam corretamente para os períodos completos");
  });

  it("records both corrective pull requests", () => {
    expect(validation).toContain("PR #485");
    expect(validation).toContain("PR #486");
    expect(validation).toContain("O pronome");
    expect(validation).toContain("não era a causa");
  });

  it("updates all continuity documents", () => {
    for (const source of [monthly, variants, readme, plan, handoff]) {
      expect(source).toContain("whatsapp-staff-agenda-monthly-summary-validation.md");
    }
  });
});
