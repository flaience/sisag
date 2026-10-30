import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";

const base = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", toPhone: "+5554991430586", correlationId: "wamid.candidate-1",
  decision: { action: "request_read_only_tool" as const, toolName: "scheduling.find_available_slots" as const, reasonCode: "availability_required", confidence: 0.99 },
};
const clarify = { ...base, toolObservation: { requested: true, status: "failed" as const, errorCode: "SCHEDULING_RESOURCE_NOT_FOUND", policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability" as const, status: "clarify" as const, text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "read_only_tool" as const } };
const ready = { ...base, toolObservation: { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability" as const, status: "ready" as const, text: "Sim. Encontrei horários disponíveis: 09:00 e 10:00.", slotCount: 2, source: "read_only_tool" as const } };
const reschedulingReady = { ...ready, correlationId: "wamid.rescheduling-alternatives", decision: { ...base.decision, toolName: "scheduling.prepare_rescheduling" as const, reasonCode: "rescheduling_required" } };
const empty = { ...base, toolObservation: { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability" as const, status: "empty" as const, text: "Não encontrei horários disponíveis para o período solicitado.", slotCount: 0, source: "read_only_tool" as const } };

afterEach(() => { delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; vi.restoreAllMocks(); });

describe("n8n agent answer candidate routing", () => {
  it("is disabled by default", async () => { const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(ready, { publish })).toEqual({ handled: false, reason: "disabled" }); expect(publish).not.toHaveBeenCalled(); });

  it.each([clarify, ready, empty, reschedulingReady])("publishes a safe eligible outcome %#", async input => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: true });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: "whatsapp.send.requested", dedupeKey: "wa_send:" + input.correlationId, payload: expect.objectContaining({ text: input.answerCandidate.text, correlationId: input.correlationId }) }));
  });

  it.each([
    { ...ready, answerCandidate: null },
    { ...ready, toolObservation: { ...ready.toolObservation, status: "failed" as const, errorCode: "private_failure" } },
    { ...ready, answerCandidate: { ...ready.answerCandidate, slotCount: 0 } },
    { ...empty, toolObservation: { ...empty.toolObservation, requested: false } },
    { ...clarify, toolObservation: { ...clarify.toolObservation, errorCode: "other_error" } },
  ])("rejects an unsafe or inconsistent candidate %#", async input => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const publish = vi.fn();
    expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("normalizes a legacy Brazilian inbound recipient", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    await routeN8nAgentAnswerCandidate({ ...ready, toPhone: "+555492056187" }, { publish });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ toPhone: "+5554992056187" }) }));
  });

  it("falls back without leaking publish errors", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    expect(await routeN8nAgentAnswerCandidate(ready, { publish: vi.fn().mockRejectedValue(new Error("private")) })).toEqual({ handled: false, reason: "candidate_publish_failed" });
  });
});
