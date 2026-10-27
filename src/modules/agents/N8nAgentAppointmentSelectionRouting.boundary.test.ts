import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");

describe("n8n agent appointment selection routing boundary", () => {
  it("is opt in and requires the exact trusted selection contract", () => {
    for (const value of ["N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED", 'candidate.kind !== "appointment_selection"', 'input.decision.toolName !== "scheduling.select_appointment"', 'input.decision.reasonCode !== "appointment_selection_required"', 'input.toolObservation.status !== "succeeded"']) expect(service).toContain(value);
    expect(deploy).toContain("N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED=true");
  });

  it("does not confuse an unknown candidate kind with an eligible upcoming candidate", () => {
    expect(service).toContain('candidate.kind === "upcoming_appointments" ? upcomingCode === null');
    expect(service).toContain('candidate.kind === "appointment_selection" ? selectionCode === null');
    expect(service).toContain(": false;");
  });

  it("publishes only text through the existing idempotent outbox path", () => {
    expect(service).toContain('dedupeKey: "wa_send:" + input.correlationId');
    expect(service).toContain('source: candidate.kind === "appointment_status"');
    expect(service).not.toContain("cancelAppointment(");
    expect(service).not.toContain("rescheduleAppointment(");
  });
});
