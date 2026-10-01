import fs from "node:fs";
import { describe,expect,it } from "vitest";
const identity=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts","utf8"),repository=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts","utf8"),inventory=fs.readFileSync("infra/whatsapp-staff-access-legacy-inventory.sql","utf8");
describe("WhatsApp staff access legacy fallback removal",()=>{
 it("has no runtime dependency on legacy provider configuration",()=>{for(const value of ["providerConfig","staffAgenda","authorizedSenders","loadWhatsAppAccountConfig"])expect(identity).not.toContain(value)});
 it("fails closed without a persisted record",()=>expect(identity).toContain('return { ok: false, reason: "unauthorized" }'));
 it("retains tenant, active account and inactive access protections",()=>{for(const value of ["whatsappStaffAccesses.companyId","whatsappAccounts.companyId",'whatsappAccounts.status, "active"',"if (!row.active"])expect(repository).toContain(value)});
 it("keeps the inventory tool for onboarding and historical cleanup",()=>{expect(inventory).toContain("ready_to_migrate");expect(inventory).toContain("already_persisted_active")});
});
