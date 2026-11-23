import { describe, expect, it } from "vitest";
import { groundN8nAgentArrivalOrderDecision } from "./N8nAgentArrivalOrderDecision";

const fallback = { action: "handoff", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: null, confidence: 0, reasonCode: "unsupported_request" } as const;

describe("n8n agent arrival order decision", () => {
  it("grounds an explicit concrete request into the read-only tool", () => {
    expect(groundN8nAgentArrivalOrderDecision("Quero atendimento por ordem de chegada amanhã de manhã", new Date("2026-11-23T01:30:00.000Z"), "America/Sao_Paulo", fallback)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.list_arrival_periods", toolArguments: { attendanceDate: "2026-11-23", dayPeriod: "morning", serviceText: null }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "arrival_order_availability_required" });
  });
  it.each(["Quero consulta às 09:00", "Quero atendimento por ordem de chegada", "Quero cancelar por ordem de chegada amanhã"])("preserves unrelated or incomplete decisions: %s", message => expect(groundN8nAgentArrivalOrderDecision(message, new Date("2026-11-23T12:00:00.000Z"), "America/Sao_Paulo", fallback)).toBe(fallback));
});
