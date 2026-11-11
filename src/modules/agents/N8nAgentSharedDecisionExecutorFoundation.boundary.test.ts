import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentSharedDecisionExecutor.service.ts", "utf8");

describe("n8n agent shared decision executor foundation boundary", () => {
  it("centralizes context mirror and observation for every channel ingress", () => {
    for (const value of ["N8nAgentChannelIngressMessage", "resolveN8nAgentConversationContext", "mirrorN8nAgentShadowMessage", "N8nAgentShadowMirrorObservationService.record", "contextContinued"]) expect(source).toContain(value);
  });

  it("does not route send persist proposals or mutate appointments yet", () => {
    for (const forbidden of ["AssistantWhatsAppService", "OutboxPublisher", "routeN8nAgent", "createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(source).not.toContain(forbidden);
  });
});
