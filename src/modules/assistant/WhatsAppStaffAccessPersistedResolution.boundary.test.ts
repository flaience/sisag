import fs from "node:fs";
import { describe,expect,it } from "vitest";
const identity=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts","utf8"),repository=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts","utf8");
describe("WhatsApp persisted staff access resolution",()=>{
 it("uses the persisted repository as the only authorization source",()=>{expect(identity).toContain("loadPersistedWhatsAppStaffAccess");expect(identity).not.toContain("loadWhatsAppAccountConfig");expect(identity).not.toContain("providerConfig")});
 it("fails closed when no persisted row exists",()=>{expect(identity).toContain('return { ok: false, reason: "unauthorized" }');expect(identity).not.toContain("authorizedSenders")});
 it("includes inactive rows so deactivation remains authoritative",()=>{expect(repository).toContain("active: whatsappStaffAccesses.active");expect(repository).toContain("if (!row.active");expect(repository).not.toContain("eq(whatsappStaffAccesses.active, true)")});
 it("keeps active account and tenant boundaries",()=>{expect(repository).toContain('eq(whatsappAccounts.status, "active")');expect(repository).toContain("eq(whatsappStaffAccesses.companyId, input.companyId)");expect(repository).toContain(".limit(2)")});
});
