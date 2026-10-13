import { describe, expect, it } from "vitest";
import { N8nAgentShadowMirrorResponseSchema } from "./N8nAgentShadowMirrorResponse.schema";

const valid = { accepted: true, mode: "shadow", correlationId: "wamid.shadow-response-1", sideEffects: "none", decision: { action: "request_read_only_tool", toolName: "scheduling.find_available_slots", reasonCode: "availability_required", confidence: 0.99 }, execution: { mode: "ai", provider: "openai", model: "gpt-6-luna", promptVersion: "n8n_agent_shadow_decision_v1", durationMs: 3500, errorCode: null }, toolObservation: { requested: true, status: "succeeded", errorCode: null, policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability", status: "ready", text: "Sim. Encontrei horários disponíveis: 09:00 e 10:00.", slotCount: 2, source: "read_only_tool" } };
describe("n8n agent shadow mirror response", () => {
  it("accepts only sanitized structured metadata", () => expect(N8nAgentShadowMirrorResponseSchema.parse(valid)).toEqual(valid));
  it.each(["answerDraft", "clarificationQuestion", "evidence", "message", "phone", "headers"])("rejects forbidden field %s", (field) => expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, [field]: "private" }).success).toBe(false));
  it("accepts the real uppercase scheduling error code and clarification candidate", () => {
    const productionResponse = {
      ...valid,
      toolObservation: { requested: true, status: "failed", errorCode: "SCHEDULING_RESOURCE_NOT_FOUND", policyVersion: "n8n_agent_foundation_v1" },
      answerCandidate: { kind: "availability", status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "read_only_tool" },
    };
    expect(N8nAgentShadowMirrorResponseSchema.safeParse(productionResponse).success).toBe(true);
  });
  it("accepts only a non-executable explicit-confirmation proposal", () => {
    const proposal = { kind: "booking_confirmation", status: "awaiting_explicit_confirmation", draft: { serviceId: "11111111-1111-4111-8111-111111111111", startTime: "2026-10-14T13:00:00.000Z", requestId: "conversation:n8n:wamid.shadow-response-1:2026-10-14T13:00:00.000Z" }, text: "Posso confirmar este agendamento? Responda SIM ou NÃO.", selectedSlot: { startsAt: "2026-10-14T13:00:00.000Z", endsAt: "2026-10-14T13:30:00.000Z", serviceId: "11111111-1111-4111-8111-111111111111", professionalId: null, unitId: null }, dispatchAllowed: false, bookingExecutionAllowed: false };
    expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, bookingConfirmationProposal: proposal }).success).toBe(true);
    expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, bookingConfirmationProposal: { ...proposal, dispatchAllowed: true } }).success).toBe(false);
    expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, bookingConfirmationProposal: { ...proposal, bookingExecutionAllowed: true } }).success).toBe(false);
  });
  it("still rejects unsafe error-code characters", () => {
    const unsafe = { ...valid, toolObservation: { ...valid.toolObservation, errorCode: "PRIVATE ERROR: secret" } };
    expect(N8nAgentShadowMirrorResponseSchema.safeParse(unsafe).success).toBe(false);
  });
  it("rejects operational side effects", () => expect(N8nAgentShadowMirrorResponseSchema.safeParse({ ...valid, sideEffects: "dispatch" }).success).toBe(false));
});
