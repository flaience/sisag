import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v10.json", "utf8"));
const serialized = JSON.stringify(workflow);
const build = workflow.nodes.find((node: { name?: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";
const record = workflow.nodes.find((node: { name?: string }) => node.name === "Record Tool Observation")?.parameters?.jsCode ?? "";
const respond = workflow.nodes.find((node: { name?: string }) => node.name === "Respond Shadow Only")?.parameters?.responseBody ?? "";

describe("n8n agent shadow v10 booking rescheduling proposal", () => {
  it("uses only the authenticated read-only preparation tool", () => {
    expect(serialized).toContain("scheduling.prepare_rescheduling");
    expect(serialized).toContain("/api/platform/agents/n8n/read-only");
    expect(serialized).not.toContain("scheduling.reschedule_appointment");
  });
  it("creates a routable but non-executable explicit proposal", () => {
    expect(build).toContain("bookingReschedulingProposal");
    expect(build).toContain("dispatchAllowed: true");
    expect(build).toContain("reschedulingExecutionAllowed: false");
    expect(build).toContain("Responda *SIM*");
  });
  it("preserves the proposal through observation and final response", () => {
    expect(record).toContain("bookingReschedulingProposal: observed.bookingReschedulingProposal ?? null");
    expect(respond).toContain("bookingReschedulingProposal: $json.bookingReschedulingProposal ?? null");
  });
  it("does not dispatch messages or mutate appointments", () => {
    for (const forbidden of ["OutboxPublisher", "WhatsAppSender", "rescheduleAppointment", "rescheduleById"]) expect(serialized).not.toContain(forbidden);
  });
});
