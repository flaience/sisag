import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";

const base = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", toPhone: "+5554992056187", correlationId: "wamid.status-1", decision: { action: "request_read_only_tool" as const, toolName: "scheduling.explain_appointment_status" as const, reasonCode: "appointment_status_required", confidence: 0.99 } };
const observation = { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" };
const ready = { ...base, toolObservation: observation, answerCandidate: { kind: "appointment_status" as const, status: "ready" as const, text: "Seu agendamento para Consulta está confirmado para 20/10/2026, 09:00.", appointmentStatus: "CONFIRMED", startsAt: "2026-10-20T12:00:00.000Z", source: "read_only_tool" as const } };
const notFound = { ...base, toolObservation: { ...observation, status: "failed" as const, errorCode: "SCHEDULING_APPOINTMENT_NOT_FOUND" }, answerCandidate: { kind: "appointment_status" as const, status: "not_found" as const, text: "Não encontrei um agendamento associado a este WhatsApp.", appointmentStatus: null, startsAt: null, source: "read_only_tool" as const } };

afterEach(() => { delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; vi.restoreAllMocks(); });
describe("n8n agent appointment status routing", () => {
  it.each([ready, notFound])("publishes a coherent safe status result %#", async input => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; const publish = vi.fn().mockResolvedValue({ id: "outbox" }); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: true }); expect(publish).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: "wa_send:wamid.status-1", payload: expect.objectContaining({ text: input.answerCandidate.text, meta: expect.objectContaining({ source: "n8n_agent_appointment_status_v1" }) }) })); });
  it.each([
    { ...ready, decision: { ...ready.decision, toolName: "scheduling.find_available_slots" as const } },
    { ...ready, toolObservation: { ...observation, status: "failed" as const, errorCode: "private_error" } },
    { ...ready, answerCandidate: { ...ready.answerCandidate, appointmentStatus: "PRIVATE" } },
    { ...ready, answerCandidate: { ...ready.answerCandidate, startsAt: "invalid" } },
    { ...notFound, toolObservation: { ...notFound.toolObservation, errorCode: "private_error" } },
  ])("rejects an inconsistent status candidate %#", async input => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" }); expect(publish).not.toHaveBeenCalled(); });
});
