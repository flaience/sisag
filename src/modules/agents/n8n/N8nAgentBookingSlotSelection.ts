import { createN8nAgentBookingConfirmationProposal, type N8nAgentBookingConfirmationProposal, type TrustedAvailabilitySlot } from "./N8nAgentBookingConfirmationProposal";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const validSlot = (slot: TrustedAvailabilitySlot) => Number.isFinite(new Date(slot.startsAt).getTime()) && Number.isFinite(new Date(slot.endsAt).getTime()) && new Date(slot.endsAt) > new Date(slot.startsAt);

function localTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value));
  const hour = parts.find(part => part.type === "hour")?.value;
  const minute = parts.find(part => part.type === "minute")?.value;
  return hour && minute ? `${hour}:${minute}` : null;
}

export function isExplicitN8nAgentBookingSlotSelection(text: string) {
  const normalized = normalize(text);
  const ordinal = /(?:^|\s)(?:primeir[oa]|segund[oa]|terceir[oa]|ultim[oa])(?:$|\s|[.,!?])/.test(normalized);
  const times = [...normalized.matchAll(/(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|h(?:([0-5]\d))?)(?=$|\s|[.,!?])/g)];
  return ordinal || times.length === 1;
}

export function selectTrustedN8nAgentBookingSlot(input: { text: string; timeZone: string; availableSlots: TrustedAvailabilitySlot[] }): TrustedAvailabilitySlot | null {
  const slots = input.availableSlots.filter(validSlot).slice().sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  if (slots.length === 0) return null;
  const text = normalize(input.text);
  const ordinalWords = [["primeiro", "primeira"], ["segundo", "segunda"], ["terceiro", "terceira"]] as const;
  const ordinalMatches = ordinalWords.flatMap((words, index) => words.some(word => new RegExp(`(?:^|\\s)${word}(?:$|\\s|[.,!?])`).test(text)) ? [index] : []);
  const lastMatches = /(?:^|\s)ultim[oa](?:$|\s|[.,!?])/.test(text) ? [Math.min(slots.length, 3) - 1] : [];
  const selectedOrdinals = [...ordinalMatches, ...lastMatches];
  if (selectedOrdinals.length === 1) return slots[selectedOrdinals[0]!] ?? null;
  if (selectedOrdinals.length > 1) return null;
  const timeMatches = [...text.matchAll(/(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|h(?:([0-5]\d))?)(?=$|\s|[.,!?])/g)];
  const requestedTimes = [...new Set(timeMatches.map(match => `${match[1]!.padStart(2, "0")}:${match[2] ?? match[3] ?? "00"}`))];
  if (requestedTimes.length !== 1) return null;
  const matches = slots.filter(slot => localTime(slot.startsAt, input.timeZone) === requestedTimes[0]);
  return matches.length === 1 ? matches[0]! : null;
}

export function createN8nAgentBookingConfirmationProposalFromSelection(input: { correlationId: string; text: string; timeZone: string; availableSlots: TrustedAvailabilitySlot[]; format: (value: string) => string }): N8nAgentBookingConfirmationProposal | null {
  const selected = selectTrustedN8nAgentBookingSlot(input);
  if (!selected) return null;
  return createN8nAgentBookingConfirmationProposal({ correlationId: input.correlationId, serviceId: selected.serviceId, selectedStartTime: selected.startsAt, availableSlots: input.availableSlots, format: input.format });
}
