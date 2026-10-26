import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
describe("n8n agent upcoming appointments routing observability", () => {
  it("records only event correlation stage and sanitized code", () => { expect(service).toContain('type Observation = { event: "n8n_agent_upcoming_appointments_routing"; correlationId: string; stage: "eligibility" | "delivery"; code: string }'); expect(service).toContain("safeObservationCode"); const calls = [...service.matchAll(/dependencies\.observe\(\{([^}]*)\}\)/g)].map(match => match[1]).join(" "); for (const forbidden of ["toPhone", "candidate.text", "appointmentCount", "companyId"]) expect(calls).not.toContain(forbidden); });
  it("observes eligibility success and delivery failure without changing idempotency", () => { for (const value of ['stage: "eligibility"', 'stage: "delivery"', 'code: "published"', 'dedupeKey: "wa_send:" + input.correlationId']) expect(service).toContain(value); });
});
