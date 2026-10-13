import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentBookingConfirmationDecision } from "./N8nAgentBookingConfirmationDecisionRouting.service";

const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", senderPhoneE164: "+555492056187", text: "SIM" };

describe("n8n agent booking confirmation decision routing", () => {
  beforeEach(() => { delete process.env.N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED; });
  it("is disabled by default", async () => { const recordDecision = vi.fn(); await expect(routeN8nAgentBookingConfirmationDecision(input, { recordDecision })).resolves.toEqual({ handled: false, reason: "disabled" }); expect(recordDecision).not.toHaveBeenCalled(); });
  it.each(["SIM", "NÃO"])("routes %s only to the atomic state recorder", async text => { process.env.N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED = "true"; const recordDecision = vi.fn().mockResolvedValue({ handled: true, decision: text === "SIM" ? "confirm" : "reject", stateId: "state" }); await expect(routeN8nAgentBookingConfirmationDecision({ ...input, text }, { recordDecision })).resolves.toMatchObject({ handled: true }); expect(recordDecision).toHaveBeenCalledWith({ ...input, text }); });
  it("leaves unrelated text on the existing path", async () => { process.env.N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED = "true"; const recordDecision = vi.fn().mockResolvedValue({ handled: false, reason: "not_confirmation" }); await expect(routeN8nAgentBookingConfirmationDecision({ ...input, text: "amanhã" }, { recordDecision })).resolves.toEqual({ handled: false, reason: "not_confirmation" }); });
});
