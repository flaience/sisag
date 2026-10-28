import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentSelectedAppointmentActionProposal.ts", "utf8");
const cancellation = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposal.ts", "utf8");
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v12.json", "utf8");

describe("n8n agent selected appointment action proposal foundation", () => {
  it("requires confirmation for cancellation and only requests a new time for rescheduling", () => {
    expect(cancellation).toContain("awaiting_explicit_confirmation");
    for (const value of ["awaiting_new_date_time", "dispatchAllowed: false", "reschedulingExecutionAllowed: false"]) expect(source).toContain(value);
  });
  it("does not execute persist route send or expose the foundation through production", () => {
    for (const forbidden of ["cancelAppointment(", "rescheduleAppointment(", "OutboxPublisher", "sendWhatsApp", "db()", "persistN8nAgent"]) expect(source).not.toContain(forbidden);
    expect(workflow).not.toContain("booking_rescheduling_target");
  });
});
