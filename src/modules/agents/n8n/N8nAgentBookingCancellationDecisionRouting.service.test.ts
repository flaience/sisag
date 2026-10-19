import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentBookingCancellationDecision } from "./N8nAgentBookingCancellationDecisionRouting.service";
const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", senderPhoneE164: "+5554992056187", text: "SIM", correlationId: "wamid.cancel-confirm" };
describe("n8n agent booking cancellation decision routing", () => {
  beforeEach(() => { delete process.env.N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED; });
  it("is disabled by default", async () => { const recordDecision = vi.fn(); await expect(routeN8nAgentBookingCancellationDecision(input, { recordDecision })).resolves.toEqual({ handled: false, reason: "disabled" }); expect(recordDecision).not.toHaveBeenCalled(); });
  it.each([["SIM", "confirm"], ["NÃO", "reject"]])("routes %s only to the atomic cancellation state recorder", async (text, decision) => { process.env.N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED = "true"; const recordDecision = vi.fn().mockResolvedValue({ handled: true, decision, stateId: "state" }); await expect(routeN8nAgentBookingCancellationDecision({ ...input, text }, { recordDecision })).resolves.toMatchObject({ handled: true, decision }); expect(recordDecision).toHaveBeenCalledWith({ ...input, text }); });
  it("preserves unrelated messages", async () => { process.env.N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED = "true"; const recordDecision = vi.fn().mockResolvedValue({ handled: false, reason: "not_confirmation" }); await expect(routeN8nAgentBookingCancellationDecision({ ...input, text: "segunda-feira" }, { recordDecision })).resolves.toEqual({ handled: false, reason: "not_confirmation" }); });
});
