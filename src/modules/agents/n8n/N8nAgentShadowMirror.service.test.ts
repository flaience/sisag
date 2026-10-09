import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorN8nAgentShadowMessage } from "./N8nAgentShadowMirror.service";

const input = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b",
  senderPhoneE164: "+5554991430586",
  providerMessageId: "wamid.shadow-mirror-001",
  text: "Há horários disponíveis amanhã?",
  receivedAt: new Date("2026-10-09T15:00:00Z"),
};

afterEach(() => {
  delete process.env.N8N_AGENT_SHADOW_MIRROR_ENABLED;
  delete process.env.N8N_AGENT_SHADOW_WEBHOOK_URL;
  delete process.env.N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE;
});

describe("n8n agent shadow mirror", () => {
  it("is disabled by default without reading a secret or calling the network", async () => {
    const dependencies = { readSecret: vi.fn(), fetch: vi.fn() as unknown as typeof fetch };
    await expect(mirrorN8nAgentShadowMessage(input, dependencies)).resolves.toEqual({ ok: true, skipped: true, reason: "disabled" });
    expect(dependencies.readSecret).not.toHaveBeenCalled();
    expect(dependencies.fetch).not.toHaveBeenCalled();
  });

  it("sends only the bounded shadow contract with the dedicated header", async () => {
    process.env.N8N_AGENT_SHADOW_MIRROR_ENABLED = "true";
    process.env.N8N_AGENT_SHADOW_WEBHOOK_URL = "https://n8n.example.test/webhook/shadow";
    process.env.N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE = "/run/secrets/shadow";
    const call = vi.fn().mockResolvedValue({ ok: true });
    await expect(mirrorN8nAgentShadowMessage(input, { readSecret: vi.fn().mockResolvedValue("secret-value\n"), fetch: call as unknown as typeof fetch }))
      .resolves.toEqual({ ok: true, skipped: false });
    const [, init] = call.mock.calls[0];
    expect(init.headers).toEqual({ "content-type": "application/json", "x-sisag-agent-shadow-secret": "secret-value" });
    const body = JSON.parse(String(init.body));
    expect(body.request).toMatchObject({ policyVersion: "n8n_agent_foundation_v1", trustedContext: { companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, correlationId: input.providerMessageId }, message: { text: input.text } });
    expect(body).not.toHaveProperty("evidence");
  });

  it("sanitizes transport failures and never throws", async () => {
    process.env.N8N_AGENT_SHADOW_MIRROR_ENABLED = "true";
    process.env.N8N_AGENT_SHADOW_WEBHOOK_URL = "https://n8n.example.test/webhook/shadow";
    process.env.N8N_AGENT_SHADOW_WEBHOOK_SECRET_FILE = "/run/secrets/shadow";
    await expect(mirrorN8nAgentShadowMessage(input, { readSecret: vi.fn().mockResolvedValue("secret"), fetch: vi.fn().mockRejectedValue(new Error("private payload")) as unknown as typeof fetch }))
      .resolves.toEqual({ ok: false, error: "shadow_transport_failed" });
  });
});
