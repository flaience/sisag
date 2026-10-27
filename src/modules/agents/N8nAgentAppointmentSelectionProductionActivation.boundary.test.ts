import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent appointment selection production activation boundary", () => {
  it("activates both the global and dedicated routing gates", () => {
    expect(deploy).toContain("N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true");
    expect(deploy).toContain("N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED=true");
    expect(service).toContain("isN8nAgentAppointmentSelectionRoutingEnabled");
  });

  it("keeps exact decision tool observation and candidate contracts", () => {
    for (const value of ['candidate.kind !== "appointment_selection"', 'input.decision.toolName !== "scheduling.select_appointment"', 'input.decision.reasonCode !== "appointment_selection_required"', 'input.toolObservation.status !== "succeeded"', 'candidate.status === "selected"']) expect(service).toContain(value);
  });

  it("uses the existing idempotent outbox route without mutation", () => {
    expect(webhook).toContain("routeN8nAgentAnswerCandidate");
    expect(service).toContain('dedupeKey: "wa_send:" + input.correlationId');
    for (const forbidden of ["cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(service).not.toContain(forbidden);
  });
});
