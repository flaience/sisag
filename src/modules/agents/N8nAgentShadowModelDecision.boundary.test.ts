import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/platform/agents/n8n/shadow-decision/route.ts", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");
const factory = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.factory.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-model-decision.md", "utf8");

describe("n8n agent shadow model decision boundary", () => {
  it("requires internal auth and retrieves tenant knowledge inside SISAG", () => {
    expect(route).toContain("validateInternalRequest");
    expect(route).toContain("retrieveKnowledge: retrieveN8nAgentKnowledge");
    expect(service).toContain("input.request.trustedContext.companyId");
  });

  it("uses Responses structured outputs through the existing provider contract", () => {
    expect(factory).toContain("OpenAIRecoveryAgentProvider");
    expect(schema).toContain("N8nAgentShadowDecisionJsonSchema");
    expect(schema).toContain('additionalProperties: false');
  });

  it("reads the existing Docker secret and requires explicit model activation", () => {
    expect(factory).toContain('/run/secrets/openai_api_key');
    expect(factory).toContain('N8N_AGENT_SHADOW_PROVIDER');
    expect(factory).toContain('N8N_AGENT_SHADOW_MODEL');
    expect(factory).not.toContain('apiKey: "');
  });

  it("cannot dispatch or execute tools", () => {
    expect(route).toContain("dispatchAllowed: false");
    expect(route).toContain("toolExecutionAllowed: false");
    for (const forbidden of ["WhatsAppSender", "outbox", "createAppointment", "cancelAppointment"]) expect(route + service).not.toContain(forbidden);
    expect(doc).toContain("não está ligado ao workflow importado");
  });
});
