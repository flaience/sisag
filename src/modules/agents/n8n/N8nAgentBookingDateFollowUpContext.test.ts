import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveN8nAgentConversationContext } from "./N8nAgentConversationContext.service";
import { groundN8nAgentAppointmentSelectionDecision } from "./N8nAgentAppointmentSelectionDecision";

const input = { companyId: "company", whatsappAccountId: "account", senderPhoneE164: "+5554992056187", providerMessageId: "wamid.current", text: "02/11 09:00", receivedAt: new Date("2026-10-29T12:00:00.000Z") };
const fallback = { action: "clarify", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Qual serviço?", confidence: 1, reasonCode: "missing_information" } as const;

describe("n8n agent booking date follow-up context", () => {
  beforeEach(() => { process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true"; });
  afterEach(() => { delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED; });
  it("keeps a date follow-up inside a new booking conversation", async () => {
    const contextual = await resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability: async () => [{ body: "Quero marcar um horário", toPhone: input.senderPhoneE164 }] });
    expect(contextual).toEqual({ text: "Solicitação anterior: Quero marcar um horário\nEscolha de horário do cliente: 02/11 09:00", continued: true });
    expect(groundN8nAgentAppointmentSelectionDecision(contextual.text, fallback)).toBe(fallback);
  });

  it("does not interpret an isolated date as appointment selection", () => {
    expect(groundN8nAgentAppointmentSelectionDecision("02/11 09:00", fallback)).toBe(fallback);
  });

  it("allows a date after the trusted upcoming appointments context", async () => {
    const contextual = await resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability: async () => [{ body: "Seus próximos agendamentos:\n1. 02/11/2026, 09:00 — Consulta", toPhone: input.senderPhoneE164 }] });
    expect(contextual.continued).toBe(true);
    expect(groundN8nAgentAppointmentSelectionDecision(contextual.text, fallback)).toMatchObject({ toolName: "scheduling.select_appointment", reasonCode: "appointment_selection_required" });
  });
});
