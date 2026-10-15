import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { bookings, clients } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";

type Input = { companyId: string; senderPhoneE164: string; appointmentId?: string | null; now?: Date };
type Target = { appointmentId: string };
type Lookup = (input: Required<Pick<Input, "companyId" | "senderPhoneE164">> & { appointmentId: string | null; now: Date }) => Promise<Target | null>;

async function trustedLookup(input: Parameters<Lookup>[0]): Promise<Target | null> {
  const db = getDb();
  const identity = [eq(clients.companyId, input.companyId), eq(clients.phoneE164, input.senderPhoneE164), eq(bookings.companyId, input.companyId), eq(bookings.clientId, clients.id)];
  const requested = input.appointmentId
    ? eq(bookings.id, input.appointmentId)
    : and(gt(bookings.startTime, input.now), inArray(bookings.status, ["PENDING", "CONFIRMED"]));
  const rows = await db.select({ appointmentId: bookings.id }).from(bookings).innerJoin(clients, eq(clients.id, bookings.clientId)).where(and(...identity, requested)).orderBy(asc(bookings.startTime), asc(bookings.id)).limit(1);
  return rows[0] ?? null;
}

export async function resolveN8nAgentAppointmentStatusTarget(input: Input, lookup: Lookup = trustedLookup) {
  const senderPhoneE164 = normalizePhoneE164(input.senderPhoneE164);
  const target = await lookup({ companyId: input.companyId, senderPhoneE164, appointmentId: input.appointmentId ?? null, now: input.now ?? new Date() });
  return target ? { ok: true as const, appointmentId: target.appointmentId } : { ok: false as const, error: "appointment_not_found" as const };
}
