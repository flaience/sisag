import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const decision = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingDecision.ts", "utf8"), context = readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8"), workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v10.json", "utf8");
describe("n8n agent explicit rescheduling date and time boundary", () => {
  it("continues after a rescheduling clarification", () => { expect(context).toContain('eq(n8nAgentShadowMirrorObservations.reasonCode, "rescheduling_required")'); expect(context).toContain('eq(n8nAgentShadowMirrorObservations.toolExecutionStatus, "skipped")'); });
  it("converts one explicit local date into a one-day trusted query", () => { expect(decision).toContain("zonedDateTimeToUtcISOString"); expect(decision).toContain("addDaysIso(explicit.dateIso, 1)"); expect(decision).toContain("dates.length !== 1 || times.length !== 1"); });
  it("selects only a slot returned by the trusted tool", () => { expect(workflow).toContain("const timeSelected = requestedTimes.length === 1 ? ordered.filter"); expect(workflow).toContain("timeSelected.length === 1 ? timeSelected[0] : null"); });
});
