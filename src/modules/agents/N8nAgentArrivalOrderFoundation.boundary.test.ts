import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("n8n agent arrival order foundation boundary", () => {
  const intent = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalOrderIntent.ts", "utf8");
  const candidate = fs.readFileSync("src/modules/agents/n8n/N8nAgentArrivalOrderAnswerCandidate.ts", "utf8");
  const sharedExecution = fs.readFileSync("src/modules/agents/n8n/N8nAgentSharedDecisionExecutor.service.ts", "utf8");
  it("requires explicit arrival wording and a concrete date", () => { for (const value of ["ordem de chegada", "sem horario marcado", "attendanceDate"]) expect(intent).toContain(value); });
  it("returns sanitized read-only period information", () => { for (const value of ["arrival_order_availability", "read_only_tool", "Nenhum horário ou posição na fila foi reservado"]) expect(candidate).toContain(value); });
  it("does not register route send check in or emit a candidate yet", () => {
    for (const value of ["registerArrivalIntention", "cancelArrivalIntention", "checkIn", "publish", "routeN8nAgentAnswerCandidate"]) expect(intent + candidate).not.toContain(value);
    expect(sharedExecution).not.toContain("arrival_order_availability");
  });
});
