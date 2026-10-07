import fs from "node:fs";
import { describe, expect, it } from "vitest";

const validation = fs.readFileSync("docs/n8n-agent-shadow-controlled-validation.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");
const workflow = fs.readFileSync("docs/n8n-agent-shadow-workflow.md", "utf8");

describe("n8n agent shadow controlled production validation docs", () => {
  it("records the exact successful shadow response", () => {
    for (const value of ["accepted=true", "mode=shadow", "correlationId=shadow-manual-20261007-001", "sideEffects=none", "cinco nós"]) expect(validation).toContain(value);
  });

  it("records secret remediation and verified no-retention", () => {
    for (const value of ["tratado como comprometido", "segredo foi rotacionado", "Do not save", "não permaneceu armazenado"]) expect(validation).toContain(value);
  });

  it("keeps activation, model, messaging and mutation outside the milestone", () => {
    for (const value of ["não ativa o workflow", "não chama modelo", "não envia áudio ou texto", "não permite ferramentas de mutação"]) expect(validation).toContain(value);
  });

  it("updates all continuity documents", () => {
    for (const source of [readme, plan, handoff, workflow]) expect(source).toContain("n8n-agent-shadow-controlled-validation.md");
  });
});
