import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent upcoming appointments routing boundary", () => {
  it("is opt-in and accepts only the trusted bounded result", () => { expect(service).toContain("N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED"); expect(service).toContain('candidate.kind !== "upcoming_appointments"'); expect(service).toContain('input.decision.toolName !== "scheduling.list_upcoming_appointments"'); expect(service).toContain('candidate.appointmentCount <= 5'); expect(deploy).toContain("N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED=true"); });
  it("keeps delivery idempotent and sanitized", () => { expect(service).toContain('dedupeKey: "wa_send:" + input.correlationId'); expect(service).toContain('normalizePhoneE164(input.toPhone)'); expect(service).toContain('candidate.text.length > 500'); expect(service).toContain('n8n_agent_upcoming_appointments_v1'); });
});
