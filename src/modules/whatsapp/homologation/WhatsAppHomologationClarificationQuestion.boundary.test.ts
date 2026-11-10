import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation clarification question boundary", () => {
  const page = readFileSync("src/app/admin/settings/whatsapp/homologation/page.tsx", "utf8");
  const service = readFileSync("src/modules/whatsapp/homologation/WhatsAppHomologationShadowDecision.service.ts", "utf8");

  it("shows the exact clarification returned by the shadow decision", () => {
    expect(page).toContain("result?.decision?.clarificationQuestion ?? null");
    expect(page).toContain("Pergunta que seria apresentada");
    expect(service).toContain("decision: result.decision");
  });

  it("does not invent dispatch or execute the clarification", () => {
    for (const forbidden of ["routeN8nAgentAnswerCandidate", "OutboxPublisher", "sendMessage", "graph.facebook.com"]) expect(page).not.toContain(forbidden);
  });
});
