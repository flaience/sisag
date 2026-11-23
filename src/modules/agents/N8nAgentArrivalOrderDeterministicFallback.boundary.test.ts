import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("n8n agent arrival order deterministic fallback boundary", () => {
  const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");
  it("grounds complete arrival intent before provider and retrieval", () => {
    const grounding = service.indexOf("const deterministicArrival = groundN8nAgentArrivalOrderDecision");
    expect(grounding).toBeGreaterThan(-1);
    expect(grounding).toBeLessThan(service.indexOf("if (!dependencies.provider)"));
    expect(grounding).toBeLessThan(service.indexOf("dependencies.retrieveKnowledge"));
  });
  it("returns a read-only decision without evidence or side effects", () => {
    const branch = service.slice(service.indexOf("const deterministicArrival"), service.indexOf("if (!dependencies.provider)"));
    for (const value of ['provider: "deterministic"', "evidence: []", "errorCode: null"]) expect(branch).toContain(value);
    for (const value of ["registerArrivalIntention", "publish", "outbox", "sendWhatsApp"]) expect(branch).not.toContain(value);
  });
});
