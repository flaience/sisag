import fs from "node:fs";
import { describe, expect, it } from "vitest";

const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffRouting.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent human handoff explicit intent boundary", () => {
  it("routes only the explicit handoff reason", () => {
    expect(routing).toContain('input.decision.reasonCode !== "handoff_required"');
    expect(routing).toContain('input.decision.action !== "handoff"');
    expect(routing).toContain("input.decision.toolName !== null");
  });

  it("lets ineligible fallbacks continue through the existing response paths", () => {
    const handoff = route.indexOf("routeN8nAgentHumanHandoff");
    const answer = route.indexOf("routeN8nAgentAnswerCandidate", handoff);
    expect(handoff).toBeGreaterThan(0);
    expect(answer).toBeGreaterThan(handoff);
    expect(route).toContain("if (!candidateHandled");
  });

  it("does not change the persisted suspension statuses", () => {
    expect(routing).toContain("shouldSuspendN8nAgentConversation");
    expect(routing).not.toContain("executeBookingCommand");
  });
});
