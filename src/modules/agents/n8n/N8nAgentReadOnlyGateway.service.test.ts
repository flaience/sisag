import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentReadOnlyGateway } from "./N8nAgentReadOnlyGateway.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const base = {
  request: { policyVersion: "n8n_agent_foundation_v1", trustedContext: { companyId, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554991430586", correlationId: "wamid.gateway-123", receivedAt: "2026-10-05T15:00:00Z", timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.gateway-123", text: "Tem horário amanhã?" } },
  evidence: [{ companyId, documentId: "11111111-1111-4111-8111-111111111111", version: 2, contentHash: "a".repeat(64), status: "approved", title: "Atendimento", excerpt: "Atendimento com hora marcada." }],
  toolCall: { name: "scheduling.find_available_slots", arguments: { serviceId: "22222222-2222-4222-8222-222222222222", dateFrom: "2026-10-06T00:00:00-03:00", dateTo: "2026-10-07T00:00:00-03:00", limit: 5 } },
};

describe("n8n agent read-only gateway", () => {
  it("executes an allowlisted read-only tool with trusted tenant context", async () => {
    const execute = vi.fn(async () => ({ ok: true, data: [] }));
    await expect(executeN8nAgentReadOnlyGateway(base, { execute })).resolves.toMatchObject({ ok: true, policyVersion: "n8n_agent_foundation_v1" });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ companyId, correlationId: "wamid.gateway-123" }));
  });
  it("fails closed before execution when evidence belongs to another tenant", async () => {
    const execute = vi.fn();
    const input = { ...base, evidence: [{ ...base.evidence[0], companyId: "33333333-3333-4333-8333-333333333333" }] };
    await expect(executeN8nAgentReadOnlyGateway(input, { execute })).resolves.toEqual({ ok: false, error: "invalid_evidence_scope" });
    expect(execute).not.toHaveBeenCalled();
  });
  it("rejects mutation tools at schema boundary", async () => {
    const execute = vi.fn();
    const input = { ...base, toolCall: { name: "scheduling.create_appointment", arguments: {} } };
    await expect(executeN8nAgentReadOnlyGateway(input, { execute })).resolves.toEqual({ ok: false, error: "invalid_gateway_request" });
    expect(execute).not.toHaveBeenCalled();
  });
  it("sanitizes executor failures", async () => {
    await expect(executeN8nAgentReadOnlyGateway(base, { execute: async () => { throw new Error("secret"); } })).resolves.toEqual({ ok: false, error: "read_only_tool_failed" });
  });
});
