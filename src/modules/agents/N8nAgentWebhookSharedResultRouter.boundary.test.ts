import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const shared = readFileSync("src/modules/agents/n8n/N8nAgentSharedResultRouter.service.ts", "utf8");

describe("n8n agent webhook shared result router boundary", () => {
  it("delegates the inspected result to one shared router", () => {
    expect(route).toContain("isN8nAgentSharedResultRoutingEnabled()");
    expect(route).toContain("routeN8nAgentSharedResult({ companyId, whatsappAccountId, toPhone: fromPhone, correlationId: providerMessageId, result })");
    expect(route).not.toContain("const routedCancellationProposal");
    expect(route).not.toContain("const routedReschedulingProposal");
  });

  it("keeps routing precedence in the shared service and fallback in the webhook", () => {
    for (const value of ["routeHandoff", "routeCancellation", "routeRescheduling", "routeBooking", "routeAnswer"]) expect(shared).toContain(value);
    expect(route).toContain("if (candidateHandled) continue");
    expect(route).toContain("AssistantWhatsAppService.handleInbound");
  });
});
