import { describe, expect, it } from "vitest";
import { N8nAgentShadowMirrorResponseSchema } from "./N8nAgentShadowMirrorResponse.schema";
import { createArrivalOrderAvailabilityAnswerCandidate } from "./N8nAgentShadowAnswerCandidate";

describe("n8n agent arrival order answer candidate integration", () => {
  it("creates a bounded candidate from trusted gateway data", () => {
    const candidate = createArrivalOrderAvailabilityAnswerCandidate({ ok: true, attendanceDate: "2026-11-24", periods: [{ serviceName: "Consulta", unitName: "Matriz", startTime: "08:00", endTime: "12:00", capacity: 20, registered: 18 }] });
    expect(candidate).toMatchObject({ kind: "arrival_order_availability", status: "ready", attendanceDate: "2026-11-24", periodCount: 1, source: "read_only_tool" });
    expect(candidate.text.length).toBeLessThanOrEqual(500);
  });
  it("is accepted by the sanitized mirror contract", () => {
    const candidate = createArrivalOrderAvailabilityAnswerCandidate({ ok: true, attendanceDate: "2026-11-24", periods: [] });
    const response = { accepted: true, mode: "shadow", correlationId: "wamid.arrival.candidate", sideEffects: "none", decision: { action: "request_read_only_tool", toolName: "scheduling.list_arrival_periods", reasonCode: "arrival_order_availability_required", confidence: 1 }, execution: { mode: "ai", provider: "openai", model: "test", promptVersion: "n8n_agent_shadow_decision_v1", durationMs: 10, errorCode: null }, toolObservation: { requested: true, status: "succeeded", errorCode: null, policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: candidate, bookingConfirmationProposal: null, bookingCancellationProposal: null, bookingReschedulingProposal: null };
    expect(N8nAgentShadowMirrorResponseSchema.safeParse(response).success).toBe(true);
  });
});
