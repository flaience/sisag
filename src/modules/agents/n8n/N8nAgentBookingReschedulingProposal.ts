export type TrustedReschedulableAppointment = {
  appointmentId: string;
  status: string;
  startsAt: string;
  serviceId: string;
  serviceName?: string | null;
};

export type TrustedReschedulingSlot = {
  startsAt: string;
  endsAt: string;
  serviceId: string;
  professionalId?: string | null;
  unitId?: string | null;
};

export type N8nAgentBookingReschedulingProposal = {
  kind: "booking_rescheduling";
  status: "awaiting_explicit_confirmation";
  draft: { appointmentId: string; serviceId: string; newStartTime: string; requestId: string };
  text: string;
  appointment: TrustedReschedulableAppointment;
  selectedSlot: TrustedReschedulingSlot;
  dispatchAllowed: false;
  reschedulingExecutionAllowed: false;
};

const reschedulableStatuses = new Set(["PENDING", "CONFIRMED"]);
const validDate = (value: string) => Number.isFinite(new Date(value).getTime());

export function isExplicitN8nAgentBookingReschedulingIntent(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
  return tokens.some((token) => ["remarcar", "remarque", "reagendar", "reagende", "remarcacao", "reagendamento"].includes(token));
}

export function createN8nAgentBookingReschedulingProposal(input: {
  correlationId: string;
  text: string;
  appointment: TrustedReschedulableAppointment;
  selectedStartTime: string;
  availableSlots: TrustedReschedulingSlot[];
  now: Date;
  format: (value: string) => string;
}): N8nAgentBookingReschedulingProposal | null {
  if (!input.correlationId.trim() || !isExplicitN8nAgentBookingReschedulingIntent(input.text)) return null;
  const currentStart = new Date(input.appointment.startsAt);
  const status = input.appointment.status.toUpperCase();
  if (!input.appointment.appointmentId.trim() || !input.appointment.serviceId.trim() || !validDate(input.appointment.startsAt) || currentStart <= input.now || !reschedulableStatuses.has(status)) return null;
  if (!validDate(input.selectedStartTime) || input.selectedStartTime === currentStart.toISOString()) return null;
  const matches = input.availableSlots.filter((slot) => slot.serviceId === input.appointment.serviceId && slot.startsAt === input.selectedStartTime && validDate(slot.startsAt) && validDate(slot.endsAt) && new Date(slot.startsAt) > input.now && new Date(slot.endsAt) > new Date(slot.startsAt));
  if (matches.length !== 1) return null;
  const selectedSlot = matches[0]!;
  const serviceName = input.appointment.serviceName?.trim().slice(0, 120) || "atendimento";
  const appointment = { ...input.appointment, status, startsAt: currentStart.toISOString(), serviceName };
  const requestId = "conversation:n8n:rescheduling:" + input.correlationId + ":" + appointment.appointmentId + ":" + selectedSlot.startsAt;
  return {
    kind: "booking_rescheduling",
    status: "awaiting_explicit_confirmation",
    draft: { appointmentId: appointment.appointmentId, serviceId: appointment.serviceId, newStartTime: selectedSlot.startsAt, requestId },
    text: "Deseja remarcar " + serviceName + " de " + input.format(appointment.startsAt) + " para " + input.format(selectedSlot.startsAt) + "?\n\nResponda *SIM* para remarcar ou *NÃO* para manter o horário atual.",
    appointment,
    selectedSlot,
    dispatchAllowed: false,
    reschedulingExecutionAllowed: false,
  };
}
