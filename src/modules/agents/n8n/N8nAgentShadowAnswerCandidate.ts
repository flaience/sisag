export type AvailabilitySlotCandidate = { startsAt: string };
export type N8nAgentShadowAnswerCandidate = { kind: "availability"; status: "ready" | "empty" | "clarify" | "failed"; text: string; slotCount: number; source: "read_only_tool" } | { kind: "appointment_status"; status: "ready" | "not_found" | "failed"; text: string; appointmentStatus: string | null; startsAt: string | null; source: "read_only_tool" };

export function createAvailabilityAnswerCandidate(input: { ok: boolean; errorCode?: string | null; slots?: AvailabilitySlotCandidate[]; timeZone: string }): N8nAgentShadowAnswerCandidate {
  if (!input.ok && input.errorCode === "SCHEDULING_RESOURCE_NOT_FOUND") return { kind: "availability", status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "read_only_tool" };
  if (!input.ok) return { kind: "availability", status: "failed", text: "Não foi possível consultar os horários agora.", slotCount: 0, source: "read_only_tool" };
  const slots = (input.slots ?? []).filter((slot) => !Number.isNaN(new Date(slot.startsAt).getTime())).slice(0, 100);
  if (slots.length === 0) return { kind: "availability", status: "empty", text: "Não encontrei horários disponíveis para o período solicitado.", slotCount: 0, source: "read_only_tool" };
  const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, weekday: "long" });
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, day: "2-digit", month: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const groups = new Map<string, { weekday: string; date: string; times: string[] }>();
  for (const slot of slots.slice(0, 3)) { const value = new Date(slot.startsAt); const date = dateFormatter.format(value); const group = groups.get(date) ?? { weekday: weekdayFormatter.format(value), date, times: [] }; group.times.push(timeFormatter.format(value)); groups.set(date, group); }
  const listed = [...groups.values()].map((group) => { const times = group.times.length === 1 ? group.times[0] : group.times.slice(0, -1).join(", ") + " e " + group.times.at(-1); return group.weekday + ", " + group.date + ": " + times; }).join("; ");
  const suffix = slots.length > 3 ? " e outros horários" : "";
  return { kind: "availability", status: "ready", text: `Sim. Encontrei horários disponíveis: ${listed}${suffix}.`, slotCount: slots.length, source: "read_only_tool" };
}


const STATUS_LABELS: Record<string, string> = {
  PENDING: "aguardando confirmação",
  CONFIRMED: "confirmado",
  CANCELLED: "cancelado",
  COMPLETED: "concluído",
  NO_SHOW: "não compareceu",
};

export function createAppointmentStatusAnswerCandidate(input: { ok: boolean; errorCode?: string | null; journey?: unknown; timeZone: string }): N8nAgentShadowAnswerCandidate {
  if (!input.ok && input.errorCode === "SCHEDULING_APPOINTMENT_NOT_FOUND") return { kind: "appointment_status", status: "not_found", text: "Não encontrei um agendamento associado a este WhatsApp.", appointmentStatus: null, startsAt: null, source: "read_only_tool" };
  if (!input.ok) return { kind: "appointment_status", status: "failed", text: "Não foi possível consultar o agendamento agora.", appointmentStatus: null, startsAt: null, source: "read_only_tool" };
  const journey = input.journey && typeof input.journey === "object" ? input.journey as Record<string, unknown> : {};
  const booking = journey.booking && typeof journey.booking === "object" ? journey.booking as Record<string, unknown> : {};
  const rawStatus = typeof booking.status === "string" ? booking.status.toUpperCase() : "";
  const date = typeof booking.startTime === "string" || booking.startTime instanceof Date ? new Date(booking.startTime) : null;
  if (!rawStatus || !date || Number.isNaN(date.getTime())) return { kind: "appointment_status", status: "failed", text: "Não foi possível consultar o agendamento agora.", appointmentStatus: null, startsAt: null, source: "read_only_tool" };
  const items = Array.isArray(journey.items) ? journey.items : [];
  const first = items[0] && typeof items[0] === "object" ? items[0] as Record<string, unknown> : {};
  const serviceName = typeof first.serviceName === "string" && first.serviceName.trim() ? first.serviceName.trim().slice(0, 120) : null;
  const formatted = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, dateStyle: "short", timeStyle: "short" }).format(date);
  const label = STATUS_LABELS[rawStatus] ?? "em acompanhamento";
  return { kind: "appointment_status", status: "ready", text: "Seu agendamento" + (serviceName ? " para " + serviceName : "") + " está " + label + " para " + formatted + ".", appointmentStatus: rawStatus, startsAt: date.toISOString(), source: "read_only_tool" };
}
