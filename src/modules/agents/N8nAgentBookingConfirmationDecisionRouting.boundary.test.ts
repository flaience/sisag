import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationDecisionRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationState.service.ts", "utf8");
describe("n8n agent booking confirmation decision routing boundary", () => {
  it("consumes a valid decision before shadow and legacy responses", () => { expect(route).toContain("routeN8nAgentBookingConfirmationDecision"); expect(route.indexOf("routeN8nAgentBookingConfirmationDecision({")).toBeLessThan(route.indexOf("mirrorN8nAgentShadowMessage({")); expect(route).toContain("if (confirmationDecision.handled) continue"); });
  it("is opt-in and preserves unrelated messages", () => { expect(service).toContain("N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED"); expect(service).toContain("const decision = await dependencies.recordDecision(input)"); expect(service).toContain("return decision"); });
  it("updates state once without executing a booking", () => { expect(state).toContain('eq(n8nAgentBookingConfirmationStates.status, "awaiting_confirmation")'); expect(state).toContain("confirmed_pending_execution"); expect(state).not.toContain("executeBookingCommand"); expect(state).not.toContain("createAppointment"); });
});
