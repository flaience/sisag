import fs from "node:fs";
import { describe,expect,it } from "vitest";
const assistant=fs.readFileSync("src/modules/assistant/AssistantWhatsApp.service.ts","utf8"),handler=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaQueryHandler.service.ts","utf8"),identity=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts","utf8"),repository=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts","utf8");
describe("WhatsApp staff agenda activation boundary",()=>{
 it("checks the staff query before client resolution",()=>expect(assistant.indexOf("handleWhatsAppStaffAgendaQuery")).toBeLessThan(assistant.indexOf("clientResolver.resolveOrCreate")));
 it("leaves unrecognized and unauthorized senders in the existing flow",()=>{expect(handler).toContain('if (!query) return { handled: false }');expect(handler).toContain('if (!authorization.ok) return { handled: false }')});
 it("requires persisted access tied to an active WhatsApp account",()=>{expect(identity).toContain("loadPersistedWhatsAppStaffAccess");expect(repository).toContain('eq(whatsappAccounts.status, "active")')});
 it("publishes staff replies without creating a client",()=>expect(assistant).toContain("clientId: null"));
});
