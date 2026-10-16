import { describe, expect, it } from "vitest";
import { groundN8nAgentBookingCancellationDecision } from "./N8nAgentBookingCancellationDecision";

const unrelated = { action: "clarify", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Como posso ajudar?", confidence: 0.8, reasonCode: "missing_information" } as const;

describe("n8n agent booking cancellation decision", () => {
  it("uses only the trusted appointment-status lookup for explicit cancellation", () => {
    expect(groundN8nAgentBookingCancellationDecision("Quero cancelar meu próximo agendamento", unrelated)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.explain_appointment_status", toolArguments: { appointmentId: null }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "appointment_status_required" });
  });
  it("preserves unrelated decisions", () => expect(groundN8nAgentBookingCancellationDecision("Qual é o status?", unrelated)).toBe(unrelated));
});
