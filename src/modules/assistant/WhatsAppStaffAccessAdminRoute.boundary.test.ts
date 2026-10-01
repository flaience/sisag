import fs from "node:fs";
import { describe,expect,it } from "vitest";
const adminPage=fs.readFileSync("src/app/admin/settings/whatsapp/page.tsx","utf8"),accessPage=fs.readFileSync("src/app/admin/settings/whatsapp/staff-accesses/page.tsx","utf8"),layout=fs.readFileSync("src/app/admin/settings/whatsapp/layout.tsx","utf8"),permissions=fs.readFileSync("src/lib/auth/permissions.ts","utf8");
describe("WhatsApp staff access admin route",()=>{
 it("places access management inside the authenticated admin tree",()=>{expect(accessPage).toContain("WhatsAppStaffAccessManagementClient");expect(accessPage).toContain('/admin/settings/whatsapp')});
 it("links the screen from WhatsApp administration",()=>{expect(adminPage).toContain('title: "Acessos da equipe"');expect(adminPage).toContain('/admin/settings/whatsapp/staff-accesses')});
 it("keeps UI and API roles aligned",()=>{expect(layout).toContain('allowedRoles: ["owner", "admin"]');expect(permissions.split("\n").find(line=>line.includes("settings\\/whatsapp"))).toContain('roles: ["owner", "admin"]')});
 it("removes the obsolete unauthenticated route",()=>{expect(fs.existsSync("src/app/settings/whatsapp/staff-accesses/page.tsx")).toBe(false)});
});
