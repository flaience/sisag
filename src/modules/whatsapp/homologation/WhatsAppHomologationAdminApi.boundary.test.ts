import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("whatsapp homologation admin API boundary", () => {
  const route = readFileSync("src/app/api/v1/settings/whatsapp/homologation/route.ts", "utf8");

  it("requires an administrative session and derives every tenant identity from it", () => {
    expect(route).toContain('requireApiRole(request, ["owner", "admin"])');
    expect(route).toContain("companyId: auth.auth.companyId");
    expect(route).toContain("whatsappAccountId: auth.auth.companyId");
  });

  it("uses only the homologation decision without Meta account lookup delivery or persistence", () => {
    expect(route).toContain("runWhatsAppHomologationShadowDecision(envelope)");
    expect(route).toContain('"cache-control": "no-store"');
    for (const forbidden of ["whatsappAccounts", "getDb", "routeN8nAgentAnswerCandidate", "OutboxPublisher", "messageLogs", ".insert(", ".update(", "graph.facebook.com"]) expect(route).not.toContain(forbidden);
  });
});
