import fs from "node:fs";
import { describe, expect, it } from "vitest";

const doc = fs.readFileSync("docs/whatsapp-staff-access-legacy-retirement.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");
const production = fs.readFileSync("docs/whatsapp-staff-access-production-validation.md", "utf8");

describe("WhatsApp staff access legacy retirement documentation", () => {
  it("records the production evidence and final persisted-only rule", () => {
    for (const value of ["PR #472", "already_persisted_active", "zero registros `ready_to_migrate`", "7 arquivos e 29 testes"]) {
      expect(doc).toContain(value);
    }
  });

  it("documents fail-closed behavior and inert legacy JSON", () => {
    for (const value of ["acesso inativo: bloqueia", "nenhum registro persistido: bloqueia", "JSON legado: não participa", "são inertes para autorização"]) {
      expect(doc).toContain(value);
    }
  });

  it("updates continuity documents with the canonical record", () => {
    for (const source of [readme, plan, handoff]) {
      expect(source).toContain("whatsapp-staff-access-legacy-retirement.md");
    }
  });

  it("removes the obsolete claim that runtime fallback remains available", () => {
    expect(production).toContain("O fallback foi aposentado no PR #472");
    expect(production).not.toContain("O JSON legado continua temporariamente disponível");
  });
});
