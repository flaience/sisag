import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const raw = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v13.json", "utf8");
const workflow = JSON.parse(raw) as { name: string; nodes: Array<{ name: string; parameters?: { jsCode?: string } }> };
const code = workflow.nodes.find(node => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";

describe("n8n agent shadow v13 selected appointment action", () => {
  it("uses only the trusted selected action result", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v13");
    for (const value of ["scheduling.resolve_selected_appointment_action", "operation?.status === 'resolved'", "operation?.action === 'cancel'"]) expect(code).toContain(value);
  });
  it("keeps cancellation closed and rescheduling without a premature proposal", () => {
    for (const value of ["dispatchAllowed: false", "cancellationExecutionAllowed: false", "Informe a nova data e o horário desejados"]) expect(code).toContain(value);
    expect(code).not.toContain("cancelAppointment(");
    expect(code).not.toContain("rescheduleAppointment(");
  });
});
