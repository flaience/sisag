import fs from "node:fs";
import { describe,expect,it } from "vitest";
const inventory=fs.readFileSync("infra/whatsapp-staff-access-legacy-inventory.sql","utf8"),migration=fs.readFileSync("infra/whatsapp-staff-access-legacy-migration.sql","utf8"),docs=fs.readFileSync("docs/whatsapp-staff-access-legacy-migration.md","utf8");
describe("WhatsApp staff access legacy migration",()=>{
 it("inventories only enabled legacy configuration on active accounts",()=>{expect(inventory).toContain("wa.status = 'active'");expect(inventory).toContain("staffAgenda");expect(inventory).toContain("authorizedSenders");expect(inventory).toContain("enabled")});
 it("classifies invalid, duplicate, persisted and eligible rows",()=>{for(const status of ["invalid_phone","invalid_role","invalid_professional_id","professional_not_active","already_persisted_active","already_persisted_inactive","duplicate_legacy","ready_to_migrate"])expect(inventory).toContain(status)});
 it("is idempotent and never updates or reactivates existing access",()=>{expect(migration).toContain("on conflict (whatsapp_account_id, phone_e164) do nothing");expect(migration).not.toContain("do update");expect(migration).not.toMatch(/update\s+public\.whatsapp_staff_accesses/i)});
 it("audits only rows inserted by this execution",()=>{expect(migration).toContain("from inserted");expect(migration).toContain("to_jsonb(inserted)");expect(migration).toContain("inserted_audits")});
 it("does not remove legacy configuration or fallback",()=>{for(const source of [inventory,migration]){expect(source).not.toContain("jsonb_set");expect(source).not.toMatch(/delete\s+from/i)}expect(docs).toContain("não remove o fallback")});
 it("documents the exact local SQL files and review order",()=>{expect(docs).toContain("C:\\sisag\\infra\\whatsapp-staff-access-legacy-inventory.sql");expect(docs).toContain("whatsapp-staff-access-legacy-migration.sql");expect(docs.indexOf("inventory.sql")).toBeLessThan(docs.indexOf("migration.sql"))});
});
