import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8"), service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingDecisionRouting.service.ts", "utf8"), state = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8");
describe("n8n agent booking rescheduling decision routing boundary", () => {
  it("consumes a valid decision before cancellation confirmation shadow and legacy", () => { const rescheduling = route.indexOf("routeN8nAgentBookingReschedulingDecision({"), cancellation = route.indexOf("routeN8nAgentBookingCancellationDecision({"), confirmation = route.indexOf("routeN8nAgentBookingConfirmationDecision({"), shadow = route.indexOf("mirrorN8nAgentShadowMessage({"); expect(rescheduling).toBeGreaterThan(-1); expect(rescheduling).toBeLessThan(cancellation); expect(rescheduling).toBeLessThan(confirmation); expect(rescheduling).toBeLessThan(shadow); });
  it("is opt-in and records only the decision", () => { expect(service).toContain("N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED"); expect(service).toContain("return dependencies.recordDecision(input)"); expect(service).not.toContain("rescheduleAppointment"); expect(service).not.toContain("EXECUTION_ENABLED"); });
  it("keeps the atomic state transition", () => { expect(state).toContain('eq(n8nAgentBookingReschedulingStates.status, "awaiting_confirmation")'); expect(state).toContain('decision === "confirm" ? "rescheduling_pending" : "rejected"'); });
});
