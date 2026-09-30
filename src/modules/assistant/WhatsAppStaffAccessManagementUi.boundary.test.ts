import fs from "node:fs";
import { describe, expect, it } from "vitest";
const page=fs.readFileSync("src/app/settings/whatsapp/staff-accesses/page.tsx","utf8"),client=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessManagement.client.tsx","utf8"),route=fs.readFileSync("src/app/api/v1/settings/whatsapp/staff-accesses/route.ts","utf8"),service=fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessManagement.service.ts","utf8");
describe("WhatsApp staff access management UI",()=>{
 it("uses the authenticated tenant API and never accepts company identifiers",()=>{expect(client).toContain('fetch("/api/v1/settings/whatsapp/staff-accesses"');expect(client).not.toContain("companyId");expect(route).toContain("auth.auth.companyId")});
 it("loads tenant-scoped active accounts and professionals",()=>{expect(route).toContain("WhatsAppStaffAccessManagementService.options");expect(service).toContain('eq(whatsappAccounts.status,"active")');expect(service).toContain("eq(professionals.companyId,companyId)")});
 it("supports manager and professional access without exposing UUID inputs",()=>{expect(client).toContain('<option value="manager">Gestor</option>');expect(client).toContain('<option value="professional">Profissional</option>');expect(client).not.toContain('placeholder="UUID')});
 it("supports audited logical activation changes",()=>{expect(client).toContain('item.active?"Desativar":"Reativar"');expect(client).toContain('method:"PATCH"');expect(client).not.toContain('method:"DELETE"')});
 it("is reachable from WhatsApp settings",()=>{expect(page).toContain("WhatsAppStaffAccessManagementClient");expect(fs.readFileSync("src/app/settings/whatsapp/page.tsx","utf8")).toContain("/settings/whatsapp/staff-accesses")});
});
