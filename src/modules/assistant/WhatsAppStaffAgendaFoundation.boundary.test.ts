import fs from "node:fs";
import { describe,expect,it } from "vitest";
const identity=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts","utf8"),repository=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts","utf8"),assistant=fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts","utf8");
describe("WhatsApp staff agenda foundation boundary",()=>{
 it("requires an exact persisted sender mapping",()=>{expect(identity).toContain("loadPersistedAccess");expect(repository).toContain("input.phone");expect(repository).toContain(".limit(2)")});
 it("scopes professionals by company and active status",()=>{expect(repository).toContain("professionals.companyId");expect(repository).toContain("professionalStatus");expect(repository).toContain('toLowerCase() === "active"')});
 it("authorizes administrative queries before resolving a client",()=>{const staff=assistant.indexOf("handleWhatsAppStaffAgendaQuery"),client=assistant.indexOf("clientResolver.resolveOrCreate");expect(staff).toBeGreaterThan(-1);expect(client).toBeGreaterThan(staff)});
});
