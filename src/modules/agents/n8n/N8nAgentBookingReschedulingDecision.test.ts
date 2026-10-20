import { describe, expect, it } from "vitest";
import { groundN8nAgentBookingReschedulingDecision } from "./N8nAgentBookingReschedulingDecision";

const unrelated = { action: "clarify", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Como posso ajudar?", confidence: 0.8, reasonCode: "missing_information" } as const;
const receivedAt = new Date("2026-10-20T12:00:00.000Z");

describe("n8n agent booking rescheduling decision", () => {
  it("uses only the bounded read-only preparation tool for explicit rescheduling", () => {
    expect(groundN8nAgentBookingReschedulingDecision("Quero remarcar meu agendamento", receivedAt, unrelated)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.prepare_rescheduling", toolArguments: { dateFrom: "2026-10-20T12:00:00.000Z", dateTo: "2026-10-27T12:00:00.000Z", limit: 20 }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "rescheduling_required" });
  });
  it("preserves unrelated decisions", () => expect(groundN8nAgentBookingReschedulingDecision("Qual é o status?", receivedAt, unrelated)).toBe(unrelated));
});
