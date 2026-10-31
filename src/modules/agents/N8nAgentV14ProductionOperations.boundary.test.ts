import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manual = readFileSync("docs/n8n-agent-operations-manual.md", "utf8");

describe("n8n agent v14 production operations", () => {
  it("documents the current workflow and selected appointment actions", () => {
    for (const value of ["SISAG Agent Shadow v14", "sisag-agent-shadow-v14.json", "N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED=true", "N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED=true", "n8n_agent_selected_appointment_action_routing"]) expect(manual).toContain(value);
  });

  it("documents the validated timeout and two availability layers", () => {
    for (const value of ["25000", "30000", "Profissionais → Horários", "Profissionais por turno", "ECONNABORTED", "context_continued = true"]) expect(manual).toContain(value);
  });
});
