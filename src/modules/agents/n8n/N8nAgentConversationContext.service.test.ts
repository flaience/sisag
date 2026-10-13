import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentConversationContext } from "./N8nAgentConversationContext.service";

const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", senderPhoneE164: "+5554992056187", providerMessageId: "wamid.current", text: "consulta", receivedAt: new Date("2026-10-13T12:10:00Z") };
const prior = { body: "Há horários disponíveis amanhã?", toPhone: "+555492056187" };

describe("n8n agent minimal conversation context", () => {
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
