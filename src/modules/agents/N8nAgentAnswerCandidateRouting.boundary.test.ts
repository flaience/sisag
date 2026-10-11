import fs from "node:fs"; import { describe, expect, it } from "vitest";
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8"); const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8"); const doc = fs.readFileSync("docs/n8n-agent-answer-candidate-routing.md", "utf8");
describe("n8n agent answer candidate routing boundary", () => {
  it("is disabled by default and narrowly eligible", () => { for (const value of ["N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED", "SCHEDULING_RESOURCE_NOT_FOUND", 'status === "clarify"']) expect(service).toContain(value); expect(doc).toContain("desativado por padrão"); });
  it("deduplicates before suppressing the legacy assistant", () => { expect(service).toContain("wa_send:"); expect(service).toContain("input.correlationId"); expect(route.indexOf("routeN8nAgentAnswerCandidate")).toBeLessThan(route.indexOf("if (candidateHandled) continue")); expect(route.indexOf("if (candidateHandled) continue")).toBeLessThan(route.indexOf("AssistantWhatsAppService.handleInbound")); });
  it("keeps fallback and forbids scheduling mutation", () => { expect(route).toContain("candidateHandled = routed.handled"); expect(route).toContain("AssistantWhatsAppService.handleInbound"); expect(service).not.toContain("createAppointment"); expect(service).not.toContain("cancelAppointment"); });
});
