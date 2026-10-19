import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationDecisionRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
describe("n8n agent booking cancellation decision routing boundary", () => {
  it("consumes a valid cancellation decision before booking confirmation and shadow", () => { expect(route).toContain("routeN8nAgentBookingCancellationDecision"); expect(route.indexOf("routeN8nAgentBookingCancellationDecision({")).toBeLessThan(route.indexOf("routeN8nAgentBookingConfirmationDecision({")); expect(route.indexOf("routeN8nAgentBookingCancellationDecision({")).toBeLessThan(route.indexOf("mirrorN8nAgentShadowMessage({")); });
  it("is opt-in and executes only confirmed cancellation", () => { expect(service).toContain("N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED"); expect(service).toContain("N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED"); expect(service).toContain('decision.decision === "confirm"'); });
  it("recovers the same pending execution", () => { expect(state).toContain('inArray(n8nAgentBookingCancellationStates.status, ["cancellation_pending", "execution_in_progress"])'); });
});
