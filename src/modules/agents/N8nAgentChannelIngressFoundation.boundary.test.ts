import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentChannelIngress.ts", "utf8");

describe("n8n agent channel ingress foundation boundary", () => {
  it("defines one ingress for text audio and homologation", () => {
    for (const value of ["whatsapp_text", "whatsapp_audio", "homologation"]) expect(source).toContain(value);
    expect(source).toContain("N8nAgentShadowMirrorInput");
  });

  it("does not duplicate transport persistence or scheduling behavior", () => {
    for (const forbidden of ["AssistantWhatsAppService", "getDb", "fetch(", "scheduling.", "dispatchAllowed"]) expect(source).not.toContain(forbidden);
  });
});
