import { isExplicitN8nAgentAppointmentSelection, selectTrustedN8nAgentAppointment, type TrustedSelectableAppointment } from "./N8nAgentAppointmentSelection";
import { listN8nAgentUpcomingAppointments } from "./N8nAgentUpcomingAppointments.service";

type Input = {
  companyId: string;
  senderPhoneE164: string;
  text: string;
  timeZone: string;
  now?: Date;
};

type TrustedList = (input: { companyId: string; senderPhoneE164: string; now?: Date; limit: number }) => Promise<{
  ok: true;
  appointments: TrustedSelectableAppointment[];
}>;

export type N8nAgentAppointmentSelectionReadModelResult =
  | { ok: true; status: "selected"; appointment: TrustedSelectableAppointment; candidateCount: number }
  | { ok: true; status: "selection_required" | "not_found_or_ambiguous"; appointment: null; candidateCount: number };

export async function resolveN8nAgentAppointmentSelectionReadModel(
  input: Input,
  trustedList: TrustedList = listN8nAgentUpcomingAppointments,
): Promise<N8nAgentAppointmentSelectionReadModelResult> {
  const result = await trustedList({
    companyId: input.companyId,
    senderPhoneE164: input.senderPhoneE164,
    now: input.now,
    limit: 5,
  });
  const appointments = result.appointments.slice(0, 5);
  if (!isExplicitN8nAgentAppointmentSelection(input.text)) {
    return { ok: true, status: "selection_required", appointment: null, candidateCount: appointments.length };
  }
  const appointment = selectTrustedN8nAgentAppointment({ text: input.text, timeZone: input.timeZone, appointments });
  return appointment
    ? { ok: true, status: "selected", appointment, candidateCount: appointments.length }
    : { ok: true, status: "not_found_or_ambiguous", appointment: null, candidateCount: appointments.length };
}
