import fs from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-answer-candidate-routing-production-activation.md", "utf8");

describe("n8n agent answer candidate routing production activation boundary", () => {
  it("activates the narrow routing flag exactly once in deploy", () => {
    expect(deploy.match(/N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED=true/g)).toHaveLength(1);
  });

  it("keeps eligibility narrow and delivery idempotent", () => {
    for (const value of ["SCHEDULING_RESOURCE_NOT_FOUND", 'candidate?.status === "clarify"', 'candidate?.status === "ready"', 'candidate?.status === "empty"', "wa_send:", "input.correlationId"]) expect(service).toContain(value);
    expect(doc).toContain("resultados read-only estreitamente validados");
  });

  it("keeps the current assistant as fallback and forbids scheduling mutations", () => {
    expect(route).toContain("AssistantWhatsAppService.handleInbound");
    expect(service).not.toContain("createAppointment");
    expect(service).not.toContain("cancelAppointment");
    expect(doc).toContain("não autoriza criação, alteração ou cancelamento de agendamentos");
  });
});
