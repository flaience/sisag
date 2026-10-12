import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";
const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", toPhone: "+5554991430586", correlationId: "wamid.candidate-1", decision: { action: "request_read_only_tool" as const, toolName: "scheduling.find_available_slots" as const, reasonCode: "availability_required", confidence: 0.99 }, toolObservation: { requested: true, status: "failed" as const, errorCode: "SCHEDULING_RESOURCE_NOT_FOUND", policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability" as const, status: "clarify" as const, text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "read_only_tool" as const } };
afterEach(() => { delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; vi.restoreAllMocks(); });
describe("n8n agent answer candidate routing", () => {
  it("is disabled by default", async () => { const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: false, reason: "disabled" }); expect(publish).not.toHaveBeenCalled(); });
  it("publishes only the eligible clarification with stable identity", async () => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; const publish = vi.fn().mockResolvedValue({ id: "outbox" }); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: true }); expect(publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: "whatsapp.send.requested", dedupeKey: "wa_send:wamid.candidate-1", payload: expect.objectContaining({ companyId: input.companyId, toPhone: input.toPhone, text: input.answerCandidate.text, correlationId: input.correlationId }) })); });
  it.each([{ ...input, answerCandidate: null }, { ...input, answerCandidate: { ...input.answerCandidate, status: "ready" as const } }, { ...input, toolObservation: { ...input.toolObservation, errorCode: null } }])("rejects an ineligible candidate %#", async invalid => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(invalid, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" }); expect(publish).not.toHaveBeenCalled(); });
  it("normalizes a legacy Brazilian inbound recipient before publishing", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    await routeN8nAgentAnswerCandidate({ ...input, toPhone: "+555492056187" }, { publish });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ toPhone: "+5554992056187" }) }));
  });
  it("normalizes a legacy Brazilian inbound recipient before publishing", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    await routeN8nAgentAnswerCandidate({ ...input, toPhone: "+555492056187" }, { publish });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ toPhone: "+5554992056187" }) }));
  });
  it("falls back without leaking publish errors", async () => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; expect(await routeN8nAgentAnswerCandidate(input, { publish: vi.fn().mockRejectedValue(new Error("private")) })).toEqual({ handled: false, reason: "candidate_publish_failed" }); });
});
