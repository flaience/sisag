import fs from "node:fs";
import { describe, expect, it } from "vitest";

const resolver = fs.readFileSync("src/modules/agents/n8n/N8nAgentServiceCatalogResolver.ts", "utf8");
const decision = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent deterministic service catalog resolution boundary", () => {
  it("runs after validated model output and before returning the decision", () => {
    expect(decision).toContain("groundServiceCatalogDecision(parsed.data, input.request.message.text, serviceCatalog)");
  });

  it("uses only unique catalog matches and never invents identifiers", () => {
    expect(resolver).toContain("matches.length !== 1");
    expect(resolver).toContain("service.id");
    expect(resolver).not.toContain("randomUUID");
  });

  it("remains read-only", () => {
    for (const mutation of ["createCompanyService", "updateCompanyService", "deactivateCompanyService", "createAppointment", "cancelAppointment"]) expect(resolver + decision).not.toContain(mutation);
  });
});
