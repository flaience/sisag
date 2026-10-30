import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentConversationContext } from "./N8nAgentConversationContext.service";

const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", senderPhoneE164: "+5554992056187", providerMessageId: "wamid.current", text: "consulta", receivedAt: new Date("2026-10-13T12:10:00Z") };
const prior = { body: "Há horários disponíveis amanhã?", toPhone: "+555492056187" };

describe("n8n agent minimal conversation context", () => {
  it("continues one explicit slot choice only when the guarded context is enabled", async () => {
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    const findPriorAvailability = vi.fn(async () => [prior]);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "10h" }, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability })).resolves.toEqual({ text: "Solicitação anterior: Há horários disponíveis amanhã?\nEscolha de horário do cliente: 10h", continued: true });
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
    expect(findPriorAvailability).toHaveBeenCalledWith(expect.objectContaining({ text: "10h" }), new Date("2026-10-13T11:55:00Z"));
  });

  it("continues a renewed availability question from the recent successful request", async () => {
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    const findPriorAvailability = vi.fn(async () => [{ body: "Há horários disponíveis para Consulta nos próximos 7 dias?", toPhone: "+555492056187" }]);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "Há horários disponíveis?" }, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability })).resolves.toEqual({ text: "Solicitação anterior: Há horários disponíveis para Consulta nos próximos 7 dias?\nNova consulta de disponibilidade do cliente: Há horários disponíveis?", continued: true });
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
  });

  it("continues a new date after a resolved selected rescheduling action", async () => {
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    const findPriorAvailability = vi.fn(async () => [{ body: "Remarque o primeiro", toPhone: "+555492056187" }]);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "09/11 15:00" }, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability })).resolves.toEqual({ text: "Solicitação anterior: Remarque o primeiro\nEscolha de horário do cliente: 09/11 15:00", continued: true });
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
  });

  it("extends only a resolved selected action to one hour", async () => {
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    const lateInput = { ...input, text: "09/11 15:00", receivedAt: new Date("2026-10-13T12:40:00Z") };
    const findPriorSelectedAction = vi.fn(async () => [{ body: "Remarque o primeiro", toPhone: "+555492056187" }]);
    await expect(resolveN8nAgentConversationContext(lateInput, { listServices: async () => [{ name: "Consulta" }], findPriorAvailability: async () => [], findPriorSelectedAction })).resolves.toEqual({ text: "Solicitação anterior: Remarque o primeiro\nEscolha de horário do cliente: 09/11 15:00", continued: true });
    expect(findPriorSelectedAction).toHaveBeenCalledWith(lateInput, new Date("2026-10-13T11:40:00Z"));
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
  });

  it("does not extend ordinary availability context beyond fifteen minutes", async () => {
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    const findPriorSelectedAction = vi.fn(async () => []);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "09/11 15:00" }, { listServices: async () => [], findPriorAvailability: async () => [], findPriorSelectedAction })).resolves.toMatchObject({ continued: false });
    expect(findPriorSelectedAction).toHaveBeenCalledTimes(1);
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
  });

  it("keeps slot continuation disabled by default and rejects vague choices", async () => {
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
    const findPriorAvailability = vi.fn(async () => [prior]);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "10h" }, { listServices: async () => [], findPriorAvailability })).resolves.toMatchObject({ continued: false });
    process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED = "true";
    await expect(resolveN8nAgentConversationContext({ ...input, text: "qualquer um" }, { listServices: async () => [], findPriorAvailability })).resolves.toMatchObject({ continued: false });
    delete process.env.N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED;
  });
  it("continues a recent missing-resource request with one exact active service", async () => {
    const result = await resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorClarification: async () => [prior] });
    expect(result).toEqual({ text: "Solicitação anterior: Há horários disponíveis amanhã?\nComplemento do cliente: consulta", continued: true });
  });

  it("matches service case and accents but requires the complete short reply", async () => {
    const findPriorClarification = vi.fn(async () => [prior]);
    await expect(resolveN8nAgentConversationContext({ ...input, text: "AVALIAÇÃO CLINICA" }, { listServices: async () => [{ name: "Avaliação Clínica" }], findPriorClarification })).resolves.toMatchObject({ continued: true });
    await expect(resolveN8nAgentConversationContext({ ...input, text: "quero consulta amanhã" }, { listServices: async () => [{ name: "Consulta" }], findPriorClarification })).resolves.toEqual({ text: "quero consulta amanhã", continued: false });
  });

  it("does not continue without a unique catalog match, prior clarification or matching recipient", async () => {
    await expect(resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }, { name: "consulta" }], findPriorClarification: async () => [prior] })).resolves.toMatchObject({ continued: false });
    await expect(resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorClarification: async () => [] })).resolves.toMatchObject({ continued: false });
    await expect(resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorClarification: async () => [{ ...prior, toPhone: "+5511999999999" }] })).resolves.toMatchObject({ continued: false });
  });

  it("passes tenant, account and a fifteen-minute cutoff to the read-only lookup", async () => {
    const findPriorClarification = vi.fn(async () => [prior]);
    await resolveN8nAgentConversationContext(input, { listServices: async () => [{ name: "Consulta" }], findPriorClarification });
    expect(findPriorClarification).toHaveBeenCalledWith(input, new Date("2026-10-13T11:55:00Z"));
  });
});
