import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { professionals, whatsappAccounts, whatsappStaffAccesses } from "@/drizzle/schema";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import type { StaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";

type AccessRow = {
  companyId: string;
  phoneE164: string;
  role: string;
  professionalId: string | null;
  professionalStatus: string | null;
  active: boolean;
};

export type PersistedStaffAccessResult =
  | { found: false }
  | { found: true; ok: false; reason: "ambiguous" | "invalid" }
  | { found: true; ok: true; identity: StaffAgendaIdentity };

export function resolvePersistedStaffAccess(input: {
  companyId: string;
  phone: string;
  rows: AccessRow[];
}): PersistedStaffAccessResult {
  if (input.rows.length === 0) return { found: false };
  if (input.rows.length !== 1) return { found: true, ok: false, reason: "ambiguous" };

  const row = input.rows[0];
  const phoneE164 = normalizePhoneE164(input.phone);
  if (!row.active || row.companyId !== input.companyId || normalizePhoneE164(row.phoneE164) !== phoneE164) {
    return { found: true, ok: false, reason: "invalid" };
  }
  if (row.role === "manager" && row.professionalId === null) {
    return { found: true, ok: true, identity: { role: "manager", companyId: input.companyId, phoneE164 } };
  }
  if (row.role === "professional" && row.professionalId && row.professionalStatus?.toLowerCase() === "active") {
    return { found: true, ok: true, identity: { role: "professional", companyId: input.companyId, phoneE164, professionalId: row.professionalId } };
  }
  return { found: true, ok: false, reason: "invalid" };
}

export async function loadPersistedWhatsAppStaffAccess(input: {
  companyId: string;
  phone: string;
}): Promise<PersistedStaffAccessResult> {
  const phoneE164 = normalizePhoneE164(input.phone);
  const rows = await getDb()
    .select({
      companyId: whatsappStaffAccesses.companyId,
      phoneE164: whatsappStaffAccesses.phoneE164,
      role: whatsappStaffAccesses.role,
      professionalId: whatsappStaffAccesses.professionalId,
      professionalStatus: professionals.status,
      active: whatsappStaffAccesses.active,
    })
    .from(whatsappStaffAccesses)
    .innerJoin(whatsappAccounts, and(
      eq(whatsappAccounts.id, whatsappStaffAccesses.whatsappAccountId),
      eq(whatsappAccounts.companyId, input.companyId),
      eq(whatsappAccounts.status, "active"),
    ))
    .leftJoin(professionals, and(
      eq(professionals.id, whatsappStaffAccesses.professionalId),
      eq(professionals.companyId, input.companyId),
    ))
    .where(and(
      eq(whatsappStaffAccesses.companyId, input.companyId),
      eq(whatsappStaffAccesses.phoneE164, phoneE164),
    ))
    .limit(2);

  return resolvePersistedStaffAccess({ companyId: input.companyId, phone: phoneE164, rows });
}
