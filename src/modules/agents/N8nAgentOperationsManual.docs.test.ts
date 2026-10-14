import fs from "node:fs";
import { describe, expect, it } from "vitest";

const manual = fs.readFileSync("docs/n8n-agent-operations-manual.md", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const plan = fs.readFileSync("docs/SISAG-plano-execucao-IA.md", "utf8");
const handoff = fs.readFileSync("docs/ai-development-handoff.md", "utf8");

describe("n8n agent operations manual", () => {
  it("documents current production architecture, configuration and validation", () => {
    for (const expected of [
      "Fluxo de produção",
      "Configuração de produção",
      "SISAG Agent Shadow v7",
      "pnpm test:run",
      "pnpm build",
      "git diff --check",
    ]) expect(manual).toContain(expected);
  });

  it("documents the guarded and explicitly confirmed booking write path", () => {
    for (const expected of [
      "confirmação explícita",
      "N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true",
      "rejeita a proposta sem criar agendamento",
      "comando oficial e idempotente de agendamento",
      "execution_uncertain",
    ]) expect(manual).toContain(expected);
  });

  it("records privacy, secret rotation and rollback procedures", () => {
    for (const expected of [
      "não devem guardar texto da conversa",
      "rotacione o valor",
      "Interrupção segura e rollback",
      "N8N_AGENT_SHADOW_MIRROR_ENABLED=false",
    ]) expect(manual).toContain(expected);
  });

  it("updates continuity documents", () => {
    for (const content of [readme, plan, handoff]) expect(content).toContain("n8n-agent-operations-manual.md");
  });
});
