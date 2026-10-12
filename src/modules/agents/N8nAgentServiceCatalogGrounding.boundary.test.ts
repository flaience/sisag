import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/platform/agents/n8n/shadow-decision/route.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent service catalog grounding boundary", () => {
  it("loads only the active catalog inside the trusted tenant", () => {
    expect(route).toContain('listCompanyServices(companyId, "", "active")');
    expect(service).toContain("dependencies.listServices(input.request.trustedContext.companyId)");
  });

  it("grounds identifiers and duration in trusted catalog data", () => {
    for (const value of ["serviceCatalog", "serviceId", "durationMinutes", "nunca invente identificadores"]) expect(service).toContain(value);
  });

  it("remains read-only", () => {
    for (const value of ["createCompanyService", "updateCompanyService", "deactivateCompanyService", "createAppointment", "cancelAppointment"]) expect((route + service)).not.toContain(value);
  });
});
