import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const candidate = readFileSync("src/modules/agents/n8n/N8nAgentShadowAnswerCandidate.ts", "utf8");
const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const routing = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
describe("n8n agent upcoming appointments answer candidate boundary", () => {
  it("is bounded localized and schema validated", () => { expect(candidate).toContain("slice(0, 5)"); expect(candidate).toContain('timeZone: input.timeZone'); expect(candidate).toContain('kind: "upcoming_appointments"'); expect(schema).toContain('z.literal("upcoming_appointments")'); expect(schema).toContain("appointmentCount"); });
  it("does not expose identity notes or mutation capability", () => { for (const forbidden of ["senderPhoneE164", "clientName", "notes", "createAppointment(", "cancelAppointment(", "rescheduleAppointment("]) expect(candidate).not.toContain(forbidden); });
  it("is routed only behind its dedicated flag", () => { expect(routing).toContain("isN8nAgentUpcomingAppointmentsRoutingEnabled"); expect(routing).toContain('candidate.kind !== "upcoming_appointments"'); expect(routing).toContain('input.decision.toolName !== "scheduling.list_upcoming_appointments"'); });
});
