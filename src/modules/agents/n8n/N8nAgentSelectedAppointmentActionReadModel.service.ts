import type { TrustedSelectableAppointment } from "./N8nAgentAppointmentSelection";
import { resolveN8nAgentSelectedAppointmentAction, type N8nAgentSelectedAppointmentAction } from "./N8nAgentSelectedAppointmentAction";
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

export type N8nAgentSelectedAppointmentActionReadModelResult =
  | { ok: true; status: "resolved"; action: N8nAgentSelectedAppointmentAction["action"]; appointment: TrustedSelectableAppointment; candidateCount: number }
  | { ok: true; status: "not_resolved"; action: null; appointment: null; candidateCount: number };

export async function resolveN8nAgentSelectedAppointmentActionReadModel(
  input: Input,
  trustedList: TrustedList = listN8nAgentUpcomingAppointments,
): Promise<N8nAgentSelectedAppointmentActionReadModelResult> {
  const result = await trustedList({ companyId: input.companyId, senderPhoneE164: input.senderPhoneE164, now: input.now, limit: 5 });
  const appointments = result.appointments.slice(0, 5);
  const resolved = resolveN8nAgentSelectedAppointmentAction({ text: input.text, timeZone: input.timeZone, appointments });
  return resolved
    ? { ok: true, status: "resolved", action: resolved.action, appointment: resolved.appointment, candidateCount: appointments.length }
    : { ok: true, status: "not_resolved", action: null, appointment: null, candidateCount: appointments.length };
}
