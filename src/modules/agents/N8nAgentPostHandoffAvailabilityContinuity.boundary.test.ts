import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { isN8nAgentAvailabilityIntent } from "./n8n/N8nAgentAvailabilityIntent";

const context = fs.readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");
const decision = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent post-handoff availability continuity boundary", () => {
  it("recognizes availability without confusing explicit human handoff", () => {
    expect(isN8nAgentAvailabilityIntent("Há horários disponíveis?")).toBe(true);
    expect(isN8nAgentAvailabilityIntent("Quero falar com atendente humano")).toBe(false);
  });

  it("reuses only a recent successful availability observation scoped by identity", () => {
    expect(context).toContain("findPriorAvailabilityDb");
    expect(context).toContain('toolExecutionStatus, "succeeded"');
    expect(context).toContain("input.companyId");
    expect(context).toContain("input.whatsappAccountId");
    expect(context).toContain("normalizePhoneE164(candidate.toPhone) === sender");
    expect(context).toContain("WINDOW_MS = 15 * 60 * 1000");
  });

  it("clarifies instead of claiming there are no slots after invalid model output", () => {
    expect(decision).toContain('fallback("invalid_output"');
    expect(decision).toContain('action: "clarify" as const');
    expect(decision).toContain('reasonCode: "availability_required" as const');
  });
});
