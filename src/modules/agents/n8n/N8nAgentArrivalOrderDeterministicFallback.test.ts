import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentShadowDecision } from "./N8nAgentShadowDecision.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const base = { request: { policyVersion: "n8n_agent_foundation_v1" as const, trustedContext: { companyId, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp" as const, senderPhoneE164: "+5554999999999", correlationId: "arrival-deterministic", receivedAt: new Date("2026-11-23T12:00:00.000Z"), timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.arrival-deterministic", text: "Quero atendimento por ordem de chegada amanhã" } } };

describe("n8n agent deterministic arrival order fallback", () => {
  it("grounds a complete request without calling provider or retrieval", async () => {
    const provider = { complete: vi.fn().mockRejectedValue(new Error("offline")) };
    const retrieveKnowledge = vi.fn();
    const result = await executeN8nAgentShadowDecision(base, { provider, providerName: "openai", retrieveKnowledge });
    expect(result).toMatchObject({ decision: { action: "request_read_only_tool", toolName: "scheduling.list_arrival_periods", reasonCode: "arrival_order_availability_required" }, execution: { mode: "fallback", provider: "deterministic", errorCode: null }, evidence: [] });
    expect(provider.complete).not.toHaveBeenCalled(); expect(retrieveKnowledge).not.toHaveBeenCalled();
  });
  it("preserves the closed provider fallback for unrelated text", async () => {
    const unrelated = { ...base, request: { ...base.request, message: { ...base.request.message, text: "Vocês atendem sábado?" } } };
    await expect(executeN8nAgentShadowDecision(unrelated, { retrieveKnowledge: vi.fn() })).resolves.toMatchObject({ decision: { action: "handoff", reasonCode: "provider_unavailable" } });
  });
});
