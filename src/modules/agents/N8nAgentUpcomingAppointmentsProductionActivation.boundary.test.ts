import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
describe("n8n agent upcoming appointments production activation", () => {
  it("activates the dedicated flag while preserving the guarded route", () => { expect(deploy).toContain("N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true"); expect(deploy).toContain("N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED=true"); expect(service).toContain("isN8nAgentUpcomingAppointmentsRoutingEnabled()"); expect(service).toContain('input.decision.reasonCode !== "upcoming_appointments_required"'); });
  it("keeps the result bounded and delivery idempotent", () => { expect(service).toContain("candidate.appointmentCount <= 5"); expect(service).toContain('candidate.text.length > 500'); expect(service).toContain('dedupeKey: "wa_send:" + input.correlationId'); });
});
