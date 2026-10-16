import fs from "node:fs";
import { describe, expect, it } from "vitest";
const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const workflow = fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v8.json", "utf8");
describe("n8n agent shadow v8 production activation", () => {
  it("uses a dedicated opt-in flag", () => { expect(deploy).toContain("N8N_AGENT_APPOINTMENT_STATUS_ROUTING_ENABLED=true"); expect(routing).toContain("isN8nAgentAppointmentStatusRoutingEnabled"); });
  it("keeps status read-only and availability independently active", () => { expect(workflow).toContain("scheduling.explain_appointment_status"); expect(routing).toContain("scheduling.find_available_slots"); for (const value of ["create_appointment", "cancel_appointment", "reschedule_appointment"]) expect(routing).not.toContain(value); });
  it("routes through the existing idempotent outbox", () => { expect(routing).toContain('dedupeKey: "wa_send:" + input.correlationId'); expect(routing).toContain("n8n_agent_appointment_status_v1"); });
});
