import { createN8nAgentBookingCancellationProposal, type N8nAgentBookingCancellationProposal } from "./N8nAgentBookingCancellationProposal";
import type { TrustedSelectableAppointment } from "./N8nAgentAppointmentSelection";

export type N8nAgentSelectedAppointmentReschedulingTarget = {
  kind: "booking_rescheduling_target";
  status: "awaiting_new_date_time";
  appointment: TrustedSelectableAppointment;
  text: string;
  dispatchAllowed: false;
  reschedulingExecutionAllowed: false;
};

export type N8nAgentSelectedAppointmentActionProposal = N8nAgentBookingCancellationProposal | N8nAgentSelectedAppointmentReschedulingTarget;

export function createN8nAgentSelectedAppointmentActionProposal(input: {
  correlationId: string;
  text: string;
  action: "cancel" | "reschedule";
  appointment: TrustedSelectableAppointment;
  now: Date;
  timeZone: string;
}): N8nAgentSelectedAppointmentActionProposal | null {
  const startsAt = new Date(input.appointment.startsAt);
  const status = input.appointment.status.toUpperCase();
  if (!input.correlationId.trim() || !input.appointment.appointmentId.trim() || !["PENDING", "CONFIRMED"].includes(status) || !Number.isFinite(startsAt.getTime()) || startsAt <= input.now) return null;
  const serviceName = input.appointment.serviceNames.filter(name => typeof name === "string" && name.trim()).map(name => name.trim().replace(/[\r\n\t]+/g, " ").slice(0, 120)).slice(0, 3).join(", ").slice(0, 180) || "atendimento";
  const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  if (input.action === "cancel") return createN8nAgentBookingCancellationProposal({ correlationId: input.correlationId, text: input.text, appointment: { appointmentId: input.appointment.appointmentId, status, startsAt: startsAt.toISOString(), serviceName }, now: input.now, format: value => formatter.format(new Date(value)) });
  return {
    kind: "booking_rescheduling_target",
    status: "awaiting_new_date_time",
    appointment: { ...input.appointment, status: status as "PENDING" | "CONFIRMED", startsAt: startsAt.toISOString(), serviceNames: input.appointment.serviceNames.slice(0, 3) },
    text: "Você escolheu remarcar " + serviceName + " de " + formatter.format(startsAt) + ". Informe a nova data e o horário desejados. Ex: 15/02 10:00.",
    dispatchAllowed: false,
    reschedulingExecutionAllowed: false,
  };
}
