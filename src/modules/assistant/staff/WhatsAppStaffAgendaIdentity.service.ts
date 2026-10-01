import { loadPersistedWhatsAppStaffAccess, type PersistedStaffAccessResult } from "./WhatsAppStaffAccessRepository.service";

export type StaffAgendaIdentity =
  | { role: "manager"; companyId: string; phoneE164: string }
  | { role: "professional"; companyId: string; phoneE164: string; professionalId: string };

export type StaffAgendaIdentityDependencies = {
  loadPersistedAccess(input: { companyId: string; phone: string }): Promise<PersistedStaffAccessResult>;
};

export type StaffAgendaIdentityResult =
  | { ok: true; identity: StaffAgendaIdentity }
  | { ok: false; reason: "unauthorized" | "ambiguous" };

export async function resolveWhatsAppStaffAgendaIdentity(
  input: { companyId: string; phone: string },
  dependencies: StaffAgendaIdentityDependencies = databaseDependencies,
): Promise<StaffAgendaIdentityResult> {
  const persisted = await dependencies.loadPersistedAccess({ companyId: input.companyId, phone: input.phone });
  if (persisted.found && persisted.ok === true) {
    return { ok: true, identity: persisted.identity };
  }
  if (persisted.found && persisted.ok === false && persisted.reason === "ambiguous") {
    return { ok: false, reason: "ambiguous" };
  }
  return { ok: false, reason: "unauthorized" };
}

const databaseDependencies: StaffAgendaIdentityDependencies = {
  loadPersistedAccess: loadPersistedWhatsAppStaffAccess,
};
