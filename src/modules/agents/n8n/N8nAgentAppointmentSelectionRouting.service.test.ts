import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";

const selected = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  toPhone: "+5554992056187",
  correlationId: "wamid.selection-routing-1",
  decision: { action: "request_read_only_tool" as const, toolName: "scheduling.select_appointment" as const, reasonCode: "appointment_selection_required", confidence: 1 },
  toolObservation: { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" },
  answerCandidate: { kind: "appointment_selection" as const, status: "selected" as const, text: "Você selecionou Consulta de 31/10/2026, 09:00 — aguardando confirmação.", appointmentStatus: "PENDING" as const, startsAt: "2026-10-31T12:00:00.000Z", source: "read_only_tool" as const },
};

afterEach(() => {
  delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED;
  delete process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED;
  vi.restoreAllMocks();
});

describe("n8n agent appointment selection routing", () => {
  it("requires both the global and dedicated gates", async () => {
    const publish = vi.fn();
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    expect(await routeN8nAgentAnswerCandidate(selected, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" });
    expect(publish).not.toHaveBeenCalled();
  });

  it("routes a coherent selected candidate idempotently", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    expect(await routeN8nAgentAnswerCandidate(selected, { publish })).toEqual({ handled: true });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: "wa_send:wamid.selection-routing-1", payload: expect.objectContaining({ text: selected.answerCandidate.text, meta: expect.objectContaining({ source: "n8n_agent_appointment_selection_v1" }) }) }));
  });

  it.each(["selection_required", "not_found_or_ambiguous"] as const)("routes a safe %s clarification", async status => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue({ id: "outbox" });
    const input = { ...selected, answerCandidate: { ...selected.answerCandidate, status, appointmentStatus: null, startsAt: null, text: "Informe primeiro, segundo ou a data e o horário." } };
    expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: true });
  });

  it("rejects failed tools mismatched decisions and invalid selected data", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED = "true";
    const publish = vi.fn();
    const inputs = [
      { ...selected, toolObservation: { ...selected.toolObservation, status: "failed" as const, errorCode: "private_error" } },
      { ...selected, decision: { ...selected.decision, toolName: "scheduling.list_upcoming_appointments" as const } },
      { ...selected, answerCandidate: { ...selected.answerCandidate, startsAt: "invalid" } },
      { ...selected, answerCandidate: { ...selected.answerCandidate, status: "failed" as const, appointmentStatus: null, startsAt: null } },
    ];
    for (const input of inputs) expect(await routeN8nAgentAnswerCandidate(input, { publish })).toEqual({ handled: false, reason: "candidate_not_eligible" });
    expect(publish).not.toHaveBeenCalled();
  });
});
