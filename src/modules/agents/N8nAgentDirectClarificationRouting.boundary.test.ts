import fs from "node:fs";
import { describe, expect, it } from "vitest";

const policy = fs.readFileSync("src/modules/agents/n8n/N8nAgentDirectClarification.ts", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const context = fs.readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");

describe("n8n agent direct clarification routing boundary", () => {
  it("uses fixed policy text only for availability clarification", () => {
    for (const value of ['action === "clarify"', 'reasonCode === "availability_required"', 'status === "skipped"', 'source: "shadow_policy"']) expect(policy).toContain(value);
    expect(policy).not.toContain("clarificationQuestion");
  });
  it("routes the same narrow contract and preserves idempotency", () => {
    for (const value of ["directClarificationEligible", 'candidate.source === "shadow_policy"', "wa_send:"]) expect(routing).toContain(value);
  });
  it("recognizes direct clarification as prior context without mutations", () => {
    expect(context).toContain('decisionAction, "clarify"');
    expect(context).toContain('reasonCode, "availability_required"');
    for (const forbidden of ["createAppointment", "cancelAppointment", "updateAppointment"]) expect(policy + routing + context).not.toContain(forbidden);
  });
});
