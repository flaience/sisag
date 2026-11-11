import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dispatch = readFileSync("src/modules/assistant/audio/WhatsAppAudioTranscriptDispatch.service.ts", "utf8");

describe("WhatsApp audio shared agent ingress boundary", () => {
  it("wraps a durable transcript in the shared channel contract", () => {
    expect(dispatch).toContain("createN8nAgentChannelIngressMessage");
    expect(dispatch).toContain('source: "whatsapp_audio"');
    expect(dispatch).toContain("whatsappAccountId: identity.whatsappAccountId");
    expect(dispatch).toContain("providerMessageId: claimed.providerMessageId");
    expect(dispatch).toContain("text: claimed.transcript");
  });

  it("keeps the existing production executor until routing is extracted", () => {
    expect(dispatch).toContain("AssistantWhatsAppService.handleInbound");
    expect(dispatch).not.toContain("mirrorN8nAgentShadowMessage");
  });
});
