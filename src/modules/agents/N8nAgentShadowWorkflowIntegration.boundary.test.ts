import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const mirror = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-workflow-integration.md", "utf8");

describe("n8n agent shadow workflow integration boundary", () => {
  it("runs text mirroring after the webhook response lifecycle", () => {
    expect(route).toContain("after(() => mirrorN8nAgentShadowMessage");
    expect(route.indexOf("saveMetaInboundMessage")).toBeLessThan(route.indexOf("after(() => mirrorN8nAgentShadowMessage"));
  });
  it("is opt-in, bounded and isolated from the current assistant", () => {
    for (const value of ["N8N_AGENT_SHADOW_MIRROR_ENABLED", "AbortSignal.timeout(5_000)", "x-sisag-agent-shadow-secret", "shadow_transport_failed"]) expect(mirror).toContain(value);
    expect(route).toContain("AssistantWhatsAppService.handleInbound");
    expect(mirror).not.toContain("AssistantWhatsAppService");
    expect(mirror).not.toContain("WhatsAppSender");
  });
  it("does not mirror audio before the authorized transcript exists", () => {
    expect(route.indexOf('if (inbound.kind === "audio")')).toBeLessThan(route.indexOf("after(() => mirrorN8nAgentShadowMessage"));
    expect(doc).toContain("áudio permanece fora desta etapa");
  });
});
