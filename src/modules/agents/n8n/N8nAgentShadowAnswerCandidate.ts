export type AvailabilitySlotCandidate = { startsAt: string };
export type N8nAgentShadowAnswerCandidate = { kind: "availability"; status: "ready" | "empty" | "clarify" | "failed"; text: string; slotCount: number; source: "read_only_tool" };

export function createAvailabilityAnswerCandidate(input: { ok: boolean; errorCode?: string | null; slots?: AvailabilitySlotCandidate[]; timeZone: string }): N8nAgentShadowAnswerCandidate {
  if (!input.ok && input.errorCode === "SCHEDULING_RESOURCE_NOT_FOUND") return { kind: "availability", status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "read_only_tool" };
  if (!input.ok) return { kind: "availability", status: "failed", text: "Não foi possível consultar os horários agora.", slotCount: 0, source: "read_only_tool" };
  const slots = (input.slots ?? []).filter((slot) => !Number.isNaN(new Date(slot.startsAt).getTime())).slice(0, 100);
  if (slots.length === 0) return { kind: "availability", status: "empty", text: "Não encontrei horários disponíveis para o período solicitado.", slotCount: 0, source: "read_only_tool" };
  const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: input.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const times = slots.slice(0, 3).map((slot) => formatter.format(new Date(slot.startsAt)));
  const listed = times.length === 1 ? times[0] : `${times.slice(0, -1).join(", ")} e ${times.at(-1)}`;
  const suffix = slots.length > 3 ? " e outros horários" : "";
  return { kind: "availability", status: "ready", text: `Sim. Encontrei horários disponíveis: ${listed}${suffix}.`, slotCount: slots.length, source: "read_only_tool" };
}
