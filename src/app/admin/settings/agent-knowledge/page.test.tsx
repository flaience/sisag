import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync("src/app/admin/settings/agent-knowledge/page.tsx", "utf8");

describe("agent knowledge settings page", () => {
  it("creates drafts instead of approved documents", () => {
    expect(source).toContain("Novo rascunho");
    expect(source).toContain("Criar rascunho");
    expect(source).not.toContain('status: "approved"');
  });

  it("explains the tenant and approval protections", () => {
    expect(source).toContain("Somente documentos aprovados, válidos e pertencentes à empresa");
    expect(source).toContain("aprovação explícita");
  });

  it("requires confirmation for lifecycle transitions", () => {
    expect(source).toContain("window.confirm");
    expect(source).toContain("Documento aprovado para consulta pelo agente.");
    expect(source).toContain("Documento retirado da consulta do agente.");
  });
});
