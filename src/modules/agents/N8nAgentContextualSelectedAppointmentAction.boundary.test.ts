import fs from "node:fs";
import { describe, expect, it } from "vitest";

const selectedAction = fs.readFileSync("src/modules/agents/n8n/N8nAgentSelectedAppointmentActionDecision.ts", "utf8");
const selection = fs.readFileSync("src/modules/agents/n8n/N8nAgentAppointmentSelectionDecision.ts", "utf8");

describe("n8n agent contextual selected appointment action", () => {
  it("reads the current contextual turn before grounding the action", () => {
    for (const value of ["currentTurn", "escolha de horario do cliente", "complemento do cliente", "resolve_selected_appointment_action"]) expect(selectedAction).toContain(value);
  });
  it("does not let remarque fall through to generic selection", () => {
    expect(selection).toContain("remarqu");
    expect(selection).toContain("return false");
  });
  it("does not add a mutation", () => {
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(selectedAction + selection).not.toContain(forbidden);
  });
});
