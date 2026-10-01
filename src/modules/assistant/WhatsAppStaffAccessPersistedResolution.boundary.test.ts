import fs from "node:fs";
import { describe, expect, it } from "vitest";
const identity=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts","utf8"),repository=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts","utf8");
describe("WhatsApp persisted staff access resolution",()=>{
 it("consults persisted access before legacy JSON",()=>expect(identity.indexOf("dependencies.loadPersistedAccess")).toBeLessThan(identity.indexOf("dependencies.loadWhatsAppAccountConfig")));
 it("uses legacy fallback only when no persisted row exists",()=>{expect(identity).toContain("persisted.found && persisted.ok === true");expect(identity).toContain("persisted.found && persisted.ok === false");expect(identity).toContain("loadWhatsAppAccountConfig")});
 it("includes inactive rows so deactivation cannot fall through",()=>{expect(repository).toContain("active: whatsappStaffAccesses.active");expect(repository).toContain("if (!row.active");expect(repository).not.toContain("eq(whatsappStaffAccesses.active, true)")});
 it("keeps active account and tenant boundaries",()=>{expect(repository).toContain('eq(whatsappAccounts.status, "active")');expect(repository).toContain("eq(whatsappStaffAccesses.companyId, input.companyId)");expect(repository).toContain(".limit(2)")});
});
