export type TrustedCancellableAppointment = {
  appointmentId: string;
  status: string;
  startsAt: string;
  serviceName?: string | null;
};

export type N8nAgentBookingCancellationProposal = {
  kind: "booking_cancellation";
  status: "awaiting_explicit_confirmation";
  draft: { appointmentId: string; requestId: string };
  text: string;
  appointment: TrustedCancellableAppointment;
  dispatchAllowed: false;
  cancellationExecutionAllowed: false;
};

const cancellableStatuses = new Set(["PENDING", "CONFIRMED"]);

export function isExplicitN8nAgentBookingCancellationIntent(text: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /(?:^|\s)(?:cancelar|cancele|desmarcar|desmarque|cancelamento)(?:$|\s|[.,!?])/.test(normalized);
}

export function createN8nAgentBookingCancellationProposal(input: {
  correlationId: string;
  text: string;
  appointment: TrustedCancellableAppointment;
  now: Date;
  format: (value: string) => string;
}): N8nAgentBookingCancellationProposal | null {
  if (!input.correlationId.trim() || !isExplicitN8nAgentBookingCancellationIntent(input.text)) return null;
  const startsAt = new Date(input.appointment.startsAt);
  const status = input.appointment.status.toUpperCase();
  if (!input.appointment.appointmentId.trim() || !Number.isFinite(startsAt.getTime()) || startsAt <= input.now || !cancellableStatuses.has(status)) return null;
  const serviceName = input.appointment.serviceName?.trim().slice(0, 120) || "atendimento";
  const appointment = { ...input.appointment, status, startsAt: startsAt.toISOString(), serviceName };
  return {
    kind: "booking_cancellation",
    status: "awaiting_explicit_confirmation",
    draft: { appointmentId: appointment.appointmentId, requestId: "conversation:n8n:cancellation:" + input.correlationId + ":" + appointment.appointmentId },
    text: "Deseja cancelar " + serviceName + " de " + input.format(appointment.startsAt) + "?\n\nResponda *SIM* para cancelar ou *NÃO* para manter o agendamento.",
    appointment,
    dispatchAllowed: false,
    cancellationExecutionAllowed: false,
  };
}
