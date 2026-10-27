import { isExplicitN8nAgentAppointmentSelection, selectTrustedN8nAgentAppointment, type TrustedSelectableAppointment } from "./N8nAgentAppointmentSelection";

export type N8nAgentSelectedAppointmentAction = {
  action: "cancel" | "reschedule";
  appointment: TrustedSelectableAppointment;
};

function normalized(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function resolveN8nAgentSelectedAppointmentAction(input: { text: string; timeZone: string; appointments: TrustedSelectableAppointment[] }): N8nAgentSelectedAppointmentAction | null {
  if (!isExplicitN8nAgentAppointmentSelection(input.text)) return null;
  const value = normalized(input.text);
  const cancellation = /\b(cancel|desmarc)\w*/.test(value);
  const rescheduling = /\b(remarc|remarqu|reagend)\w*/.test(value);
  if (cancellation === rescheduling) return null;
  const appointment = selectTrustedN8nAgentAppointment({ text: input.text, timeZone: input.timeZone, appointments: input.appointments.slice(0, 5) });
  if (!appointment) return null;
  return { action: cancellation ? "cancel" : "reschedule", appointment };
}
