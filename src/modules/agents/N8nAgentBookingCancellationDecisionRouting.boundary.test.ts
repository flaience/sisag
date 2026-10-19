import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationDecisionRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent booking cancellation decision routing boundary", () => {
  it("consumes a valid cancellation decision before booking confirmation and shadow", () => { expect(route).toContain("routeN8nAgentBookingCancellationDecision"); expect(route.indexOf("routeN8nAgentBookingCancellationDecision({")).toBeLessThan(route.indexOf("routeN8nAgentBookingConfirmationDecision({")); expect(route.indexOf("routeN8nAgentBookingCancellationDecision({")).toBeLessThan(route.indexOf("mirrorN8nAgentShadowMessage({")); expect(route).toContain("if (cancellationDecision.handled) continue"); });
  it("is opt-in and preserves unrelated messages", () => { expect(service).toContain("N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED"); expect(service).toContain("return dependencies.recordDecision(input)"); expect(deploy).toContain("N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED=true"); });
  it("moves state atomically without executing cancellation", () => { expect(state).toContain('eq(n8nAgentBookingCancellationStates.status, "awaiting_confirmation")'); expect(state).toContain("cancellation_pending"); expect(state).toContain("rejected"); expect(service).not.toContain("cancelAppointment"); expect(state).not.toContain("cancelAppointment"); });
});
