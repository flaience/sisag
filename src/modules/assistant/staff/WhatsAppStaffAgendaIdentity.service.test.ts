import { describe, expect, it, vi } from "vitest";
import { resolveWhatsAppStaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";

const professionalId = "6c87792c-8dd2-446f-9731-e2d30306266d";
const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";

const deps = (providerConfig: unknown, professional: any = null, persisted: any = { found: false }) => ({
  loadPersistedAccess: vi.fn().mockResolvedValue(persisted),
  loadWhatsAppAccountConfig: vi.fn().mockResolvedValue(providerConfig),
  loadProfessional: vi.fn().mockResolvedValue(professional),
});

describe("WhatsApp staff agenda identity", () => {
  it("uses a persisted authorization before reading the legacy configuration", async () => {
    const dependencies = deps({}, null, { found: true, ok: true, identity: { role: "manager", companyId, phoneE164: "+5511999999999" } });
    const result = await resolveWhatsAppStaffAgendaIdentity({ companyId, phone: "+5511999999999" }, dependencies);
    expect(result).toEqual({ ok: true, identity: { role: "manager", companyId, phoneE164: "+5511999999999" } });
    expect(dependencies.loadWhatsAppAccountConfig).not.toHaveBeenCalled();
  });

  it("does not restore a disabled persisted access through legacy fallback", async () => {
    const dependencies = deps(
      { staffAgenda: { enabled: true, authorizedSenders: [{ phoneE164: "+5511999999999", role: "manager" }] } },
      null,
      { found: true, ok: false, reason: "invalid" },
    );
    const result = await resolveWhatsAppStaffAgendaIdentity({ companyId, phone: "+5511999999999" }, dependencies);
    expect(result).toEqual({ ok: false, reason: "unauthorized" });
    expect(dependencies.loadWhatsAppAccountConfig).not.toHaveBeenCalled();
  });

  it("falls back to legacy JSON only when no persisted mapping exists", async () => {
    const dependencies = deps({ staffAgenda: { enabled: true, authorizedSenders: [{ phoneE164: "+5511999999999", role: "manager" }] } });
    const result = await resolveWhatsAppStaffAgendaIdentity({ companyId, phone: "+5511999999999" }, dependencies);
    expect(result.ok).toBe(true);
    expect(dependencies.loadWhatsAppAccountConfig).toHaveBeenCalledOnce();
  });

  it("fails closed when staff agenda is not explicitly enabled", async () => {
    const result = await resolveWhatsAppStaffAgendaIdentity({ companyId, phone: "+5511999999999" }, deps({}));
    expect(result).toEqual({ ok: false, reason: "not_configured" });
  });

  it("authorizes exactly one explicitly configured manager phone", async () => {
    const result = await resolveWhatsAppStaffAgendaIdentity(
      { companyId, phone: "5511999999999" },
      deps({ staffAgenda: { enabled: true, authorizedSenders: [{ phoneE164: "+5511999999999", role: "manager" }] } }),
    );
    expect(result).toEqual({ ok: true, identity: { role: "manager", companyId, phoneE164: "+5511999999999" } });
  });

  it("requires an active professional belonging to the same company", async () => {
    const dependencies = deps(
      { staffAgenda: { enabled: true, authorizedSenders: [{ phoneE164: "+5511999999999", role: "professional", professionalId }] } },
      { id: professionalId, companyId, status: "ACTIVE" },
    );
    const result = await resolveWhatsAppStaffAgendaIdentity({ companyId, phone: "+5511999999999" }, dependencies);
    expect(result).toEqual({ ok: true, identity: { role: "professional", companyId, phoneE164: "+5511999999999", professionalId } });
    expect(dependencies.loadProfessional).toHaveBeenCalledWith({ companyId, professionalId });
  });

  it("rejects duplicate phone mappings instead of guessing", async () => {
    const sender = { phoneE164: "+5511999999999", role: "manager" };
    const result = await resolveWhatsAppStaffAgendaIdentity(
      { companyId, phone: "+5511999999999" },
      deps({ staffAgenda: { enabled: true, authorizedSenders: [sender, sender] } }),
    );
    expect(result).toEqual({ ok: false, reason: "ambiguous" });
  });
});
