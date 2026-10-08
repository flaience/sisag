import fs from "node:fs";
import { describe, expect, it } from "vitest";

const manual = fs.readFileSync("docs/n8n-agent-operations-manual.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("n8n agent operations manual", () => {
  it("documents architecture, configuration and validation", () => {
    for (const expected of ["Arquitetura", "Credenciais e segredos", "Conhecimento RAG", "Decisão estruturada do modelo", "pnpm test:run", "pnpm lint", "pnpm build"]) expect(manual).toContain(expected);
  });

  it("keeps shadow mode free of side effects", () => {
    for (const expected of ["modo sombra", "não envia respostas ao WhatsApp", "dispatchAllowed=false", "toolExecutionAllowed=false", "Ferramentas de escrita continuam proibidas"]) expect(manual).toContain(expected);
  });

  it("records privacy and secret rotation procedures", () => {
    for (const expected of ["Do not save", "considerado comprometido", "gere outro valor", "Não podem conter texto da mensagem"]) expect(manual).toContain(expected);
  });

  it("updates continuity documents", () => {
    for (const content of [readme, plan, handoff]) expect(content).toContain("n8n-agent-operations-manual.md");
  });
});
