import { describe, expect, it } from "vitest";
import { createN8nAgentChannelIngressMessage } from "./N8nAgentChannelIngress";

const common = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b",
  senderPhoneE164: "+555492056187",
  providerMessageId: "wamid.shared-ingress",
  text: "Quero marcar uma consulta",
  receivedAt: new Date("2026-11-11T12:00:00.000Z"),
  timeZone: "America/Sao_Paulo",
};

describe("n8n agent channel ingress", () => {
  it.each(["whatsapp_text", "whatsapp_audio", "homologation"] as const)("keeps one canonical agent input for %s", (source) => {
    const result = createN8nAgentChannelIngressMessage({ ...common, source });
    expect(result).toEqual({ source, mirrorInput: common });
  });

  it("does not add channel-specific text or change the correlation identity", () => {
    const result = createN8nAgentChannelIngressMessage({ ...common, source: "whatsapp_audio" });
    expect(result.mirrorInput.text).toBe(common.text);
    expect(result.mirrorInput.providerMessageId).toBe(common.providerMessageId);
  });
});
