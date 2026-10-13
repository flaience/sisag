import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";
import { createN8nAgentDirectClarificationCandidate } from "./N8nAgentDirectClarification";

const decision = { action: "clarify" as const, toolName: null, reasonCode: "availability_required", confidence: 0.98 };
const toolObservation = { requested: false, status: "skipped" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" };

afterEach(() => { delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; vi.restoreAllMocks(); });

describe("n8n agent direct clarification", () => {
  it("creates only the fixed availability clarification", () => {
    expect(createN8nAgentDirectClarificationCandidate({ decision, toolObservation })).toEqual({ kind: "availability", status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "shadow_policy" });
  });
  it("rejects other reasons, tool states and actions", () => {
    expect(createN8nAgentDirectClarificationCandidate({ decision: { ...decision, reasonCode: "missing_context" }, toolObservation })).toBeNull();
    expect(createN8nAgentDirectClarificationCandidate({ decision, toolObservation: { ...toolObservation, status: "failed" } })).toBeNull();
    expect(createN8nAgentDirectClarificationCandidate({ decision: { ...decision, action: "handoff" }, toolObservation })).toBeNull();
  });
  it("routes the fixed policy candidate idempotently", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    const answerCandidate = createN8nAgentDirectClarificationCandidate({ decision, toolObservation });
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    await expect(routeN8nAgentAnswerCandidate({ companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", toPhone: "+5554991430586", correlationId: "wamid.direct-clarify", decision, toolObservation, answerCandidate }, { publish })).resolves.toEqual({ handled: true });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: "wa_send:wamid.direct-clarify", payload: expect.objectContaining({ text: answerCandidate!.text }) }));
  });
});
