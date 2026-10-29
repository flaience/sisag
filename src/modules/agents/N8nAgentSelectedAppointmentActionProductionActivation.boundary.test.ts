import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
const raw = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v14.json", "utf8");
const workflow = JSON.parse(raw) as { name: string; nodes: Array<{ name: string; parameters?: { jsCode?: string } }> };
const code = workflow.nodes.find(node => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";
const start = code.indexOf("if (!bookingCancellationProposal && toolName === 'scheduling.resolve_selected_appointment_action'");
const end = code.indexOf("let bookingReschedulingProposal = null;", start);
const selectedCancellation = code.slice(start, end);

describe("n8n agent selected appointment action production activation", () => {
  it("activates the dedicated routing gate", () => {
    expect(deploy).toContain("N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED=true");
    expect(workflow.name).toBe("SISAG Agent Shadow v14");
  });
  it("opens only dispatch for the selected cancellation proposal", () => {
    expect(selectedCancellation).toContain("dispatchAllowed: true");
    expect(selectedCancellation).toContain("cancellationExecutionAllowed: false");
    expect(selectedCancellation).toContain("Responda *SIM*");
  });
  it("keeps direct mutation absent and rescheduling awaiting a new time", () => {
    expect(code).toContain("Informe a nova data e o horário desejados");
    for (const forbidden of ["cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(code).not.toContain(forbidden);
  });
});
