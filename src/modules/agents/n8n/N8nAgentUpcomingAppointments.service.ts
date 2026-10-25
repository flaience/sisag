import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { bookingItems, bookings, clients, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";

type Input = { companyId: string; senderPhoneE164: string; now?: Date; limit?: number };
type Row = { appointmentId: string; status: "PENDING" | "CONFIRMED"; startsAt: Date; serviceName: string | null };
type Lookup = (input: { companyId: string; senderPhoneE164: string; now: Date; rowLimit: number }) => Promise<Row[]>;

async function trustedLookup(input: Parameters<Lookup>[0]): Promise<Row[]> {
  const rows = await getDb().select({ appointmentId: bookings.id, status: bookings.status, startsAt: bookings.startTime, serviceName: services.name })
    .from(bookings)
    .innerJoin(clients, and(eq(clients.id, bookings.clientId), eq(clients.companyId, input.companyId), eq(clients.phoneE164, input.senderPhoneE164)))
    .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .leftJoin(services, and(eq(services.id, bookingItems.serviceId), eq(services.companyId, input.companyId)))
    .where(and(eq(bookings.companyId, input.companyId), gt(bookings.startTime, input.now), inArray(bookings.status, ["PENDING", "CONFIRMED"])))
    .orderBy(asc(bookings.startTime), asc(bookings.id), asc(services.name))
    .limit(input.rowLimit);
  return rows.map(row => ({ ...row, status: row.status as "PENDING" | "CONFIRMED" }));
}

export async function listN8nAgentUpcomingAppointments(input: Input, lookup: Lookup = trustedLookup) {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 5), 1), 5);
  const rows = await lookup({ companyId: input.companyId, senderPhoneE164: normalizePhoneE164(input.senderPhoneE164), now: input.now ?? new Date(), rowLimit: limit * 5 });
  const grouped = new Map<string, { appointmentId: string; status: "PENDING" | "CONFIRMED"; startsAt: string; serviceNames: string[] }>();
  for (const row of rows) {
    if (!grouped.has(row.appointmentId)) grouped.set(row.appointmentId, { appointmentId: row.appointmentId, status: row.status, startsAt: row.startsAt.toISOString(), serviceNames: [] });
    const item = grouped.get(row.appointmentId)!;
    const name = row.serviceName?.trim().slice(0, 120);
    if (name && !item.serviceNames.includes(name)) item.serviceNames.push(name);
  }
  return { ok: true as const, appointments: [...grouped.values()].slice(0, limit) };
}
