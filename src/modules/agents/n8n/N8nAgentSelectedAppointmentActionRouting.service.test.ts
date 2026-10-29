import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentBookingCancellationProposal } from "./N8nAgentBookingCancellationProposalRouting.service";
import { routeN8nAgentAnswerCandidate } from "./N8nAgentAnswerCandidateRouting.service";

const appointmentId = "22222222-2222-4222-8222-222222222222";
const decision = { action: "request_read_only_tool" as const, toolName: "scheduling.resolve_selected_appointment_action" as const, reasonCode: "selected_appointment_action_required", confidence: 1 };
const toolObservation = { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" };

afterEach(() => { delete process.env.N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED; delete process.env.N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED; delete process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED; delete process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED; });

describe("n8n agent selected appointment action routing", () => {
  it("routes a selected cancellation only through the existing confirmation persistence", async () => {
    process.env.N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED = "true";
    const persistAndPublish = vi.fn().mockResolvedValue(undefined);
    const result = await routeN8nAgentBookingCancellationProposal({ companyId: "company", whatsappAccountId: "account", toPhone: "+5554992056187", correlationId: "wamid.selected-cancel", decision, toolObservation, proposal: { kind: "booking_cancellation", status: "awaiting_explicit_confirmation", draft: { appointmentId, requestId: "cancel:1" }, text: "Deseja cancelar Consulta? Responda *SIM* para cancelar ou *NÃO* para manter o agendamento.", appointment: { appointmentId, status: "CONFIRMED", startsAt: "2099-10-31T12:00:00.000Z", serviceName: "Consulta" }, dispatchAllowed: true, cancellationExecutionAllowed: false } }, { persistAndPublish, publishFallback: vi.fn(), observe: vi.fn() });
    expect(result).toEqual({ handled: true });
    expect(persistAndPublish).toHaveBeenCalledOnce();
  });

  it("routes only the selected rescheduling request for a new date", async () => {
    process.env.N8N_AGENT_SELECTED_APPOINTMENT_ACTION_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED = "true";
    const publish = vi.fn().mockResolvedValue(undefined);
    const answerCandidate = { kind: "appointment_selection" as const, status: "selected" as const, text: "Você escolheu remarcar Consulta. Informe a nova data e o horário desejados.", appointmentStatus: "CONFIRMED" as const, startsAt: "2099-10-31T12:00:00.000Z", source: "read_only_tool" as const };
    expect(await routeN8nAgentAnswerCandidate({ companyId: "company", toPhone: "+5554992056187", correlationId: "wamid.selected-reschedule", decision, toolObservation, answerCandidate }, { publish, observe: vi.fn() })).toEqual({ handled: true });
    expect(publish).toHaveBeenCalledOnce();
  });

  it("fails closed while the selected action flag is disabled", async () => {
    process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED = "true";
    process.env.N8N_AGENT_APPOINTMENT_SELECTION_ROUTING_ENABLED = "true";
    const publish = vi.fn();
    const answerCandidate = { kind: "appointment_selection" as const, status: "selected" as const, text: "Informe a nova data e o horário desejados.", appointmentStatus: "CONFIRMED" as const, startsAt: "2099-10-31T12:00:00.000Z", source: "read_only_tool" as const };
    expect(await routeN8nAgentAnswerCandidate({ companyId: "company", toPhone: "+5554992056187", correlationId: "wamid.disabled", decision, toolObservation, answerCandidate }, { publish, observe: vi.fn() })).toEqual({ handled: false, reason: "candidate_not_eligible" });
    expect(publish).not.toHaveBeenCalled();
  });
});
