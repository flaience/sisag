import { describe, expect, it } from "vitest";
import { resolvePersistedStaffAccess } from "./WhatsAppStaffAccessRepository.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const phoneE164 = "+5554991430586";
const professionalId = "6c87792c-8dd2-446f-9731-e2d30306266d";

describe("WhatsApp persisted staff access", () => {
  it("signals fallback compatibility when no persisted access exists", () => {
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [] })).toEqual({ found: false });
  });

  it("resolves one manager in the same company", () => {
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [{ companyId, phoneE164, role: "manager", professionalId: null, professionalStatus: null }] }))
      .toEqual({ found: true, ok: true, identity: { role: "manager", companyId, phoneE164 } });
  });

  it("resolves only an active professional", () => {
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [{ companyId, phoneE164, role: "professional", professionalId, professionalStatus: "ACTIVE" }] }))
      .toEqual({ found: true, ok: true, identity: { role: "professional", companyId, phoneE164, professionalId } });
  });

  it("fails closed for ambiguity, company mismatch and inactive professional", () => {
    const manager = { companyId, phoneE164, role: "manager", professionalId: null, professionalStatus: null };
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [manager, manager] })).toMatchObject({ found: true, ok: false });
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [{ ...manager, companyId: "other" }] })).toMatchObject({ found: true, ok: false });
    expect(resolvePersistedStaffAccess({ companyId, phone: phoneE164, rows: [{ companyId, phoneE164, role: "professional", professionalId, professionalStatus: "inactive" }] })).toMatchObject({ found: true, ok: false });
  });
});
