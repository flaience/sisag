import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cancellation = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposalRouting.service.ts", "utf8");
const answer = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");

describe("n8n agent selected appointment action routing boundary", () => {
  it("is opt-in and reuses the guarded cancellation and answer routes", () => {
    for (const source of [cancellation, answer]) expect(source).toContain("N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED");
    expect(cancellation).toContain("scheduling.resolve_selected_appointment_action");
    expect(answer).toContain('candidate.text.includes("nova data")');
  });
  it("does not add direct cancellation or rescheduling execution", () => {
    for (const source of [cancellation, answer]) for (const forbidden of ["cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(source).not.toContain(forbidden);
  });
});
