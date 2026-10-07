import { describe, expect, it } from "vitest";
import { createN8nAgentGatewayObservation } from "./N8nAgentGatewayObservation";

const input = {
  request: {
    policyVersion: "n8n_agent_foundation_v1" as const,
    trustedContext: { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp" as const, senderPhoneE164: "+5554991430586", correlationId: "shadow-observation-1", receivedAt: new Date("2026-10-07T12:00:00Z"), timeZone: "America/Sao_Paulo" },
    message: { providerMessageId: "wamid.secret-message", text: "Mensagem privada do cliente" },
  },
  toolCall: { name: "scheduling.find_available_slots" as const, arguments: { dateFrom: "2026-10-08T00:00:00-03:00", dateTo: "2026-10-09T00:00:00-03:00" } },
};

describe("sanitized n8n agent gateway observation", () => {
  it("keeps correlation, tenant, tool and immutable evidence references", () => {
    const observation = createN8nAgentGatewayObservation(input, { ok: true, evidence: [{ documentId: "11111111-1111-4111-8111-111111111111", version: 2, contentHash: "a".repeat(64) }] }, new Date("2026-10-07T12:01:00Z"));
    expect(observation).toMatchObject({ event: "n8n_agent_read_only_gateway", mode: "shadow", companyId: input.request.trustedContext.companyId, correlationId: "shadow-observation-1", toolName: "scheduling.find_available_slots", ok: true });
    expect(observation.evidence[0]).toEqual({ documentId: "11111111-1111-4111-8111-111111111111", version: 2, contentHash: "a".repeat(64) });
  });

  it("excludes message, phone, WhatsApp account, appointment data and secrets", () => {
    const serialized = JSON.stringify(createN8nAgentGatewayObservation(input, { ok: true }));
    for (const forbidden of ["Mensagem privada", "+5554991430586", "e87c8491", "wamid.secret-message", "x-platform-internal-secret", "gatewayData", "appointments", "availableSlots"]) expect(serialized).not.toContain(forbidden);
  });

  it("records only a sanitized error code", () => {
    const observation = createN8nAgentGatewayObservation(input, { ok: false, error: "knowledge_retrieval_failed" });
    expect(observation).toMatchObject({ ok: false, errorCode: "knowledge_retrieval_failed", evidence: [] });
  });
});
