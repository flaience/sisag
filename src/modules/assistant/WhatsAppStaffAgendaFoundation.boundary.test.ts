import fs from "node:fs";
import { describe, expect, it } from "vitest";

const identity = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts", "utf8");
const assistant = fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts", "utf8");

describe("WhatsApp staff agenda foundation boundary", () => {
  it("requires explicit enablement and an exact sender mapping", () => {
    expect(identity).toContain("config?.enabled");
    expect(identity).toContain("matches.length !== 1");
  });

  it("scopes professionals by company and active status", () => {
    expect(identity).toContain("companyId: input.companyId, professionalId: sender.professionalId");
    expect(identity).toContain('professional.status?.toLowerCase() !== "active"');
  });

  it("does not activate administrative queries in the client flow yet", () => {
    expect(assistant).not.toContain("resolveWhatsAppStaffAgendaIdentity");
    expect(assistant).not.toContain("interpretStaffAgendaQuery");
  });
});
