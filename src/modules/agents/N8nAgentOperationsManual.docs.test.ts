import fs from "node:fs";
import { describe, expect, it } from "vitest";

const manual = fs.readFileSync("docs/n8n-agent-operations-manual.md", "utf8");
const normalized = manual.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

describe("n8n agent operations manual", () => {
  it("documents the current v10 production operation", () => {
    for (const expected of ["sisag agent shadow v10", "fluxo de producao", "configuracao de producao", "pnpm test:run", "pnpm build"]) expect(normalized).toContain(expected);
  });

  it("documents all guarded scheduling mutations", () => {
    for (const expected of ["confirmacao explicita", "cancelar", "remarcar", "dispatchallowed: true", "reschedulingexecutionallowed: false", "execution_uncertain"]) expect(normalized).toContain(expected);
  });

  it("documents handoff privacy and rollback", () => {
    for (const expected of ["encaminhar para humano", "nao devem guardar texto da conversa", "interrupcao segura e rollback", "rotacione o valor"]) expect(normalized).toContain(expected);
  });
});
