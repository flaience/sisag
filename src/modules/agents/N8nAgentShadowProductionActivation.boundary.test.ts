import fs from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const mirror = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-model-production-activation.md", "utf8");

describe("n8n agent shadow production activation boundary", () => {
  it("requires and provisions the dedicated secret without printing its value", () => {
    for (const value of ["N8N_AGENT_SHADOW_WEBHOOK_SECRET", "docker secret inspect n8n_agent_shadow_webhook_secret_v1", "docker secret create n8n_agent_shadow_webhook_secret_v1", "N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE=/run/secrets/n8n_agent_shadow_webhook_secret_v1"]) expect(deploy).toContain(value);
    expect(deploy).not.toContain('echo "$N8N_AGENT_SHADOW_WEBHOOK_SECRET"');
  });
  it("activates only the fixed production HTTPS endpoint", () => {
    expect(deploy).toContain("N8N_AGENT_SHADOW_MIRROR_ENABLED=true");
    expect(deploy).toContain("N8N_AGENT_SHADOW_WEBHOOK_URL=https://n8n.flaience.com/webhook/4578414e-786d-42f6-86bb-8632a4540cbb");
    expect(deploy).not.toContain("N8N_AGENT_SHADOW_WEBHOOK_URL=https://n8n.flaience.com/webhook-test/");
    expect(mirror).toContain('url.protocol !== "https:"');
  });
  it("keeps the current WhatsApp path authoritative and the activation shadow-only", () => {
    for (const value of ["sideEffects=none", "não substitui", "desativação imediata"]) expect(doc).toContain(value);
    expect(mirror).not.toContain("WhatsAppSender");
  });
});
