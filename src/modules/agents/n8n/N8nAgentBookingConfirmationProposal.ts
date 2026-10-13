import { createAgentSchedulingDraft, formatDraftConfirmation, type AgentSchedulingDraft } from "@/modules/conversation/AgentSchedulingDraft";

export type TrustedAvailabilitySlot = { startsAt: string; endsAt: string; serviceId: string; professionalId?: string | null; unitId?: string | null };
export type N8nAgentBookingConfirmationProposal = {
  kind: "booking_confirmation";
  status: "awaiting_explicit_confirmation";
  draft: AgentSchedulingDraft;
  text: string;
  selectedSlot: TrustedAvailabilitySlot;
  dispatchAllowed: false;
  bookingExecutionAllowed: false;
};

const validIso = (value: string) => Number.isFinite(new Date(value).getTime());

export function createN8nAgentBookingConfirmationProposal(input: {
  correlationId: string;
  serviceId: string;
  selectedStartTime: string;
  availableSlots: TrustedAvailabilitySlot[];
  format: (value: string) => string;
}): N8nAgentBookingConfirmationProposal | null {
  if (!input.correlationId.trim() || !input.serviceId.trim() || !validIso(input.selectedStartTime)) return null;
  const matches = input.availableSlots.filter(slot => slot.serviceId === input.serviceId && slot.startsAt === input.selectedStartTime && validIso(slot.startsAt) && validIso(slot.endsAt) && new Date(slot.endsAt) > new Date(slot.startsAt));
  if (matches.length !== 1) return null;
  const selectedSlot = matches[0]!;
  const draft = createAgentSchedulingDraft({ sessionId: "n8n:" + input.correlationId, serviceId: input.serviceId, startTime: selectedSlot.startsAt });
  return { kind: "booking_confirmation", status: "awaiting_explicit_confirmation", draft, text: formatDraftConfirmation(draft, input.format), selectedSlot, dispatchAllowed: false, bookingExecutionAllowed: false };
}
