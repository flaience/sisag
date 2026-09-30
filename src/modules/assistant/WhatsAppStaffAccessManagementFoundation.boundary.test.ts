import fs from "node:fs";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
const sql = fs.readFileSync("infra/whatsapp-staff-access-management-foundation.sql", "utf8");
const repository = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAccessRepository.service.ts", "utf8");
const identity = fs.readFileSync("src/modules/assistant/staff/WhatsAppStaffAgendaIdentity.service.ts", "utf8");

describe("WhatsApp staff access management foundation", () => {
  it("models tenant, account, normalized phone, role and lifecycle", () => {
    for (const token of ["companyId", "whatsappAccountId", "phoneE164", "professionalId", "active", "createdBy", "updatedBy"]) expect(schema).toContain(token);
    expect(schema).toContain("whatsapp_staff_accesses_account_phone_uq");
  });

  it("enforces role shape and cross-company guards in SQL", () => {
    expect(sql).toContain("whatsapp_staff_accesses_professional_role_check");
    expect(sql).toContain("whatsapp_account_company_mismatch");
    expect(sql).toContain("professional_company_mismatch");
  });

  it("enables RLS and adds immutable audit snapshots", () => {
    expect(sql).toContain("alter table public.whatsapp_staff_accesses enable row level security");
    expect(sql).toContain("alter table public.whatsapp_staff_access_audit enable row level security");
    expect(schema).toContain('snapshot: jsonb("snapshot").notNull()');
  });

  it("keeps production on the legacy JSON until migration is explicitly activated", () => {
    expect(repository).toContain("loadPersistedWhatsAppStaffAccess");
    expect(identity).not.toContain("loadPersistedWhatsAppStaffAccess");
  });
});
