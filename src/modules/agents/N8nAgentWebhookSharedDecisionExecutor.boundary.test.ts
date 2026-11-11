import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const executor = readFileSync("src/modules/agents/n8n/N8nAgentSharedDecisionExecutor.service.ts", "utf8");

describe("n8n agent webhook shared decision executor boundary", () => {
  it("delegates text context decision and observation to the shared executor", () => {
    expect(route).toContain("createN8nAgentChannelIngressMessage");
    expect(route).toContain('source: "whatsapp_text"');
    expect(route).toContain("executeN8nAgentSharedDecision(ingress)");
    expect(route).not.toContain("resolveN8nAgentConversationContext({");
    expect(route).not.toContain("N8nAgentShadowMirrorObservationService.record({");
    expect(executor).toContain("resolveN8nAgentConversationContext");
    expect(executor).toContain("N8nAgentShadowMirrorObservationService.record");
  });

  it("keeps proposal routing confirmation and legacy fallback in the webhook", () => {
    for (const value of ["routeN8nAgentBookingConfirmationDecision", "routeN8nAgentBookingCancellationProposal", "routeN8nAgentBookingReschedulingProposal", "routeN8nAgentAnswerCandidate", "AssistantWhatsAppService.handleInbound"]) expect(route).toContain(value);
  });
});
