import fs from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const factory = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.factory.ts", "utf8");
const route = fs.readFileSync("src/app/api/platform/agents/n8n/shadow-decision/route.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-model-deploy.md", "utf8");

describe("n8n agent shadow model deploy", () => {
  it("configures an explicit provider, model and bounded timeout", () => {
    for (const value of ["N8N_AGENT_SHADOW_PROVIDER=openai", "N8N_AGENT_SHADOW_MODEL=gpt-6-luna", "N8N_AGENT_SHADOW_TIMEOUT_MS=8000"]) expect(deploy).toContain(value);
    for (const value of ["N8N_AGENT_SHADOW_PROVIDER", "N8N_AGENT_SHADOW_MODEL", "N8N_AGENT_SHADOW_TIMEOUT_MS"]) expect(factory).toContain(value);
  });

  it("reuses the mounted OpenAI Docker secret without embedding it", () => {
    for (const value of ["openai_api_key", "/run/secrets/openai_api_key"]) expect(deploy + factory).toContain(value);
    expect(deploy).not.toContain("OPENAI_API_KEY=");
    expect(factory).not.toContain('apiKey: "');
  });

  it("keeps the route in shadow mode without dispatch or tool execution", () => {
    expect(route).toContain("dispatchAllowed: false");
    expect(route).toContain("toolExecutionAllowed: false");
    for (const forbidden of ["WhatsAppSender", "outbox", "createAppointment", "cancelAppointment"]) expect(route).not.toContain(forbidden);
  });

  it("documents isolated validation before workflow integration", () => {
    for (const value of ["workflow importado ainda não chama", "mode=ai", "dispatchAllowed=false", "toolExecutionAllowed=false"]) expect(doc).toContain(value);
  });
});
