import fs from "node:fs";
import { describe, expect, it } from "vitest";

const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent conversation context continuity boundary", () => {
  it("isolates the lookup by company, WhatsApp account, recipient and time", () => {
    for (const value of ["input.companyId", "input.whatsappAccountId", "normalizePhoneE164", "WINDOW_MS", "SCHEDULING_RESOURCE_NOT_FOUND"]) expect(service).toContain(value);
  });
  it("requires one exact active service and one prior clarification", () => {
    expect(service).toContain('listCompanyServices(companyId, "", "active")');
    expect(service).toContain("matches.length !== 1");
    expect(service).toContain("Complemento do cliente");
  });
  it("is fail-open to the existing assistant and remains read-only", () => {
    expect(route).toContain(".catch(() => ({ text: inbound.text, continued: false as const }))");
    for (const mutation of ["createAppointment", "cancelAppointment", "updateAppointment", "createCompanyService"]) expect(service).not.toContain(mutation);
  });
});
