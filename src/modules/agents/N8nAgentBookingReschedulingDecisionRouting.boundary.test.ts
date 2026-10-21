import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8"), service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingDecisionRouting.service.ts", "utf8"), state = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8");
describe("n8n agent booking rescheduling decision routing boundary", () => {
  it("consumes a valid decision before cancellation confirmation shadow and legacy", () => { const rescheduling = route.indexOf("routeN8nAgentBookingReschedulingDecision({"), cancellation = route.indexOf("routeN8nAgentBookingCancellationDecision({"), confirmation = route.indexOf("routeN8nAgentBookingConfirmationDecision({"), shadow = route.indexOf("mirrorN8nAgentShadowMessage({"); expect(rescheduling).toBeGreaterThan(-1); expect(rescheduling).toBeLessThan(cancellation); expect(rescheduling).toBeLessThan(confirmation); expect(rescheduling).toBeLessThan(shadow); });
  it("is opt-in and executes only confirmed rescheduling", () => { expect(service).toContain("N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED"); expect(service).toContain("N8N_AGENT_BOOKING_RESCHEDULING_EXECUTION_ENABLED"); expect(service).toContain('decision.decision === "confirm"'); expect(service).toContain("executePersistedN8nAgentBookingRescheduling"); });
  it("recovers the same pending execution", () => { expect(state).toContain('inArray(n8nAgentBookingReschedulingStates.status, ["rescheduling_pending", "execution_in_progress"])'); });
});
