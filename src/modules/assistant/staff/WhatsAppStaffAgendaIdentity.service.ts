import { and, eq } from "drizzle-orm";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { getDb } from "@/lib/db";
import { professionals, whatsappAccounts } from "@/drizzle/schema";
import { loadPersistedWhatsAppStaffAccess, type PersistedStaffAccessResult } from "./WhatsAppStaffAccessRepository.service";

export type StaffAgendaIdentity =
  | { role: "manager"; companyId: string; phoneE164: string }
  | { role: "professional"; companyId: string; phoneE164: string; professionalId: string };

type AuthorizedSender = {
  phoneE164?: unknown;
  role?: unknown;
  professionalId?: unknown;
};

type ProfessionalRecord = {
  id: string;
  companyId: string;
  status: string | null;
};

export type StaffAgendaIdentityDependencies = {
  loadPersistedAccess(input: { companyId: string; phone: string }): Promise<PersistedStaffAccessResult>;
  loadWhatsAppAccountConfig(input: { companyId: string }): Promise<unknown>;
  loadProfessional(input: { companyId: string; professionalId: string }): Promise<ProfessionalRecord | null>;
};

export type StaffAgendaIdentityResult =
  | { ok: true; identity: StaffAgendaIdentity }
  | { ok: false; reason: "not_configured" | "unauthorized" | "ambiguous" | "invalid_professional" };

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function readStaffAgendaConfig(value: unknown): { enabled: boolean; authorizedSenders: AuthorizedSender[] } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const staffAgenda = (value as Record<string, unknown>).staffAgenda;
  if (!staffAgenda || typeof staffAgenda !== "object" || Array.isArray(staffAgenda)) return null;
  const record = staffAgenda as Record<string, unknown>;
  return {
    enabled: record.enabled === true,
    authorizedSenders: Array.isArray(record.authorizedSenders) ? record.authorizedSenders.filter((item): item is AuthorizedSender => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [],
  };
}

export async function resolveWhatsAppStaffAgendaIdentity(
  input: { companyId: string; phone: string },
  dependencies: StaffAgendaIdentityDependencies = databaseDependencies,
): Promise<StaffAgendaIdentityResult> {
  const persisted = await dependencies.loadPersistedAccess({ companyId: input.companyId, phone: input.phone });
  if (persisted.found && persisted.ok === true) {
    return { ok: true, identity: persisted.identity };
  }
  if (persisted.found && persisted.ok === false) {
    return { ok: false, reason: persisted.reason === "ambiguous" ? "ambiguous" : "unauthorized" };
  }

  const config = readStaffAgendaConfig(await dependencies.loadWhatsAppAccountConfig({ companyId: input.companyId }));
  if (!config?.enabled) return { ok: false, reason: "not_configured" };

  const phoneE164 = normalizePhoneE164(input.phone);
  const matches = config.authorizedSenders.filter((sender) => {
    if (typeof sender.phoneE164 !== "string") return false;
    try {
      return normalizePhoneE164(sender.phoneE164) === phoneE164;
    } catch {
      return false;
    }
  });

  if (matches.length === 0) return { ok: false, reason: "unauthorized" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };

  const sender = matches[0];
  if (sender.role === "manager") {
    return { ok: true, identity: { role: "manager", companyId: input.companyId, phoneE164 } };
  }

  if (sender.role !== "professional" || typeof sender.professionalId !== "string" || !isUuid(sender.professionalId)) {
    return { ok: false, reason: "invalid_professional" };
  }

  const professional = await dependencies.loadProfessional({ companyId: input.companyId, professionalId: sender.professionalId });
  if (!professional || professional.companyId !== input.companyId || professional.id !== sender.professionalId || professional.status?.toLowerCase() !== "active") {
    return { ok: false, reason: "invalid_professional" };
  }

  return {
    ok: true,
    identity: { role: "professional", companyId: input.companyId, phoneE164, professionalId: professional.id },
  };
}

const databaseDependencies: StaffAgendaIdentityDependencies = {
  loadPersistedAccess: loadPersistedWhatsAppStaffAccess,

  async loadWhatsAppAccountConfig({ companyId }) {
    const rows = await getDb()
      .select({ providerConfig: whatsappAccounts.providerConfig })
      .from(whatsappAccounts)
      .where(and(eq(whatsappAccounts.companyId, companyId), eq(whatsappAccounts.status, "active")))
      .limit(2);
    return rows.length === 1 ? rows[0].providerConfig : null;
  },

  async loadProfessional({ companyId, professionalId }) {
    const [row] = await getDb()
      .select({ id: professionals.id, companyId: professionals.companyId, status: professionals.status })
      .from(professionals)
      .where(and(eq(professionals.id, professionalId), eq(professionals.companyId, companyId)))
      .limit(1);
    return row ?? null;
  },
};
