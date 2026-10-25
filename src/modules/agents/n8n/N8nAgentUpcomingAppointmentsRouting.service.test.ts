import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";

const base = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", toPhone: "+5554992056187", correlationId: "wamid.upcoming-routing-1", decision: { action: "request_read_only_tool" as const, toolName: "scheduling.list_upcoming_appointments" as const, reasonCode: "upcoming_appointments_required", confidence: 1 }, toolObservation: { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" } };
const ready = { ...base, answerCandidate: { kind: "upcoming_appointments" as const, status: "ready" as const, text: "Seus próximos agendamentos:\n1. 26/10/2026, 09:00 — Consulta — confirmado", appointmentCount: 1, source: "read_only_tool" as const } };
const empty = { ...base, answerCandidate: { kind: "upcoming_appointments" as const, status: "empty" as const, text: "Você não possui agendamentos futuros pendentes ou confirmados.", appointmentCount: 0, source: "read_only_tool" as const } };

afterEach(() => { delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; delete process.env.N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED; vi.restoreAllMocks(); });
describe("n8n agent upcoming appointments routing", () => {
  it("is independently disabled by default", async () => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(ready, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" }); expect(publish).not.toHaveBeenCalled(); });
  it.each([ready, empty])("publishes a coherent trusted list %#", async input => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; process.env.N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED = "true"; const publish = vi.fn().mockResolvedValue({ id: "outbox" }); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: true }); expect(publish).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: "wa_send:wamid.upcoming-routing-1", payload: expect.objectContaining({ text: input.answerCandidate.text, meta: expect.objectContaining({ source: "n8n_agent_upcoming_appointments_v1" }) }) })); });
  it.each([
    { ...ready, decision: { ...ready.decision, toolName: "scheduling.explain_appointment_status" as const } },
    { ...ready, decision: { ...ready.decision, reasonCode: "appointment_status_required" } },
    { ...ready, toolObservation: { ...ready.toolObservation, status: "failed" as const, errorCode: "private_error" } },
    { ...ready, answerCandidate: { ...ready.answerCandidate, appointmentCount: 0 } },
    { ...empty, answerCandidate: { ...empty.answerCandidate, appointmentCount: 1 } },
  ])("rejects an inconsistent candidate %#", async input => { process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true"; process.env.N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED = "true"; const publish = vi.fn(); expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" }); expect(publish).not.toHaveBeenCalled(); });
});
