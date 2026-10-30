import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { zonedDateTimeToUtcISOString } from "@/lib/time";

export type ReschedulingReadAppointment = {
  appointmentId: string;
  status: "PENDING" | "CONFIRMED";
  startsAt: string;
  serviceId: string;
  serviceName: string | null;
};

export type ReschedulingReadSlot = {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  professionalId: string | null;
  unitId: string | null;
};

type Input = { companyId: string; senderPhoneE164: string; correlationId: string; dateFrom: string; dateTo: string; timeZone: string; limit?: number; now?: Date };
type AppointmentResult = { ok: true; appointment: ReschedulingReadAppointment } | { ok: false; error: "appointment_not_found" | "appointment_not_reschedulable" };
type SlotResult = { ok: true; slots: ReschedulingReadSlot[] } | { ok: false; error: "availability_failed" };
type Dependencies = {
  resolveAppointment: (input: { companyId: string; senderPhoneE164: string; now: Date }) => Promise<AppointmentResult>;
  findAvailableSlots: (input: { companyId: string; correlationId: string; serviceId: string; dateFrom: string; dateTo: string; limit: number }) => Promise<SlotResult>;
};

const validDate = (value: string) => Number.isFinite(new Date(value).getTime());

function localDateIso(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const year = part("year"), month = part("month"), day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function trustedSlots(slots: ReschedulingReadSlot[], serviceId: string, appointmentStart: Date, now: Date, limit: number) {
  return slots.filter(slot => slot.serviceId === serviceId && validDate(slot.startsAt) && validDate(slot.endsAt) && new Date(slot.startsAt) > now && new Date(slot.endsAt) > new Date(slot.startsAt) && slot.startsAt !== appointmentStart.toISOString()).slice(0, limit);
}

export async function prepareN8nAgentBookingReschedulingReadModel(input: Input, dependencies: Dependencies) {
  const now = input.now ?? new Date();
  const dateFrom = new Date(input.dateFrom);
  const dateTo = new Date(input.dateTo);
  if (!input.companyId.trim() || !input.correlationId.trim() || !validDate(input.dateFrom) || !validDate(input.dateTo) || dateTo <= dateFrom || dateTo.getTime() - dateFrom.getTime() > 31 * 24 * 60 * 60 * 1000) return { ok: false as const, error: "invalid_request" as const };
  const senderPhoneE164 = normalizePhoneE164(input.senderPhoneE164);
  const resolved = await dependencies.resolveAppointment({ companyId: input.companyId, senderPhoneE164, now });
  if (!resolved.ok) return resolved;
  const appointmentStart = new Date(resolved.appointment.startsAt);
  if (!validDate(resolved.appointment.startsAt) || appointmentStart <= now || !["PENDING", "CONFIRMED"].includes(resolved.appointment.status) || !resolved.appointment.serviceId.trim()) return { ok: false as const, error: "appointment_not_reschedulable" as const };
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 20);
  const availability = await dependencies.findAvailableSlots({ companyId: input.companyId, correlationId: input.correlationId, serviceId: resolved.appointment.serviceId, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString(), limit });
  if (!availability.ok) return availability;
  let slots = trustedSlots(availability.slots, resolved.appointment.serviceId, appointmentStart, now, limit);
  if (slots.length === 0) {
    const localDate = localDateIso(dateFrom, input.timeZone);
    const alternativeFrom = localDate ? new Date(zonedDateTimeToUtcISOString(localDate, "00:00", input.timeZone)) : null;
    if (alternativeFrom && Number.isFinite(alternativeFrom.getTime()) && alternativeFrom < dateFrom && alternativeFrom < dateTo) {
      const alternatives = await dependencies.findAvailableSlots({ companyId: input.companyId, correlationId: input.correlationId, serviceId: resolved.appointment.serviceId, dateFrom: alternativeFrom.toISOString(), dateTo: dateTo.toISOString(), limit });
      if (alternatives.ok) slots = trustedSlots(alternatives.slots, resolved.appointment.serviceId, appointmentStart, now, limit);
    }
  }
  return { ok: true as const, appointment: { ...resolved.appointment, startsAt: appointmentStart.toISOString() }, slots };
}
