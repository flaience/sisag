import { describe, expect, it, vi } from "vitest";
import { createN8nAgentBookingConfirmationProposalFromSelection, selectTrustedN8nAgentBookingSlot } from "./N8nAgentBookingSlotSelection";

const serviceId = "11111111-1111-4111-8111-111111111111";
const slots = [
  { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T12:30:00.000Z", serviceId },
  { startsAt: "2026-10-14T13:00:00.000Z", endsAt: "2026-10-14T13:30:00.000Z", serviceId },
  { startsAt: "2026-10-14T14:00:00.000Z", endsAt: "2026-10-14T14:30:00.000Z", serviceId },
];

describe("n8n agent booking slot selection", () => {
  it("selects one exact offered local time", () => {
    expect(selectTrustedN8nAgentBookingSlot({ text: "Pode ser às 10:00.", timeZone: "America/Sao_Paulo", availableSlots: slots })?.startsAt).toBe(slots[1]!.startsAt);
    expect(selectTrustedN8nAgentBookingSlot({ text: "Quero 9h", timeZone: "America/Sao_Paulo", availableSlots: slots })?.startsAt).toBe(slots[0]!.startsAt);
  });
  it("selects an offered ordinal and rejects ambiguity or invented times", () => {
    expect(selectTrustedN8nAgentBookingSlot({ text: "O segundo, por favor", timeZone: "America/Sao_Paulo", availableSlots: slots })?.startsAt).toBe(slots[1]!.startsAt);
    expect(selectTrustedN8nAgentBookingSlot({ text: "O último", timeZone: "America/Sao_Paulo", availableSlots: [...slots, { ...slots[2]!, startsAt: "2026-10-14T15:00:00.000Z", endsAt: "2026-10-14T15:30:00.000Z" }] })?.startsAt).toBe(slots[2]!.startsAt);
    expect(selectTrustedN8nAgentBookingSlot({ text: "O primeiro ou o último", timeZone: "America/Sao_Paulo", availableSlots: slots })).toBeNull();
    expect(selectTrustedN8nAgentBookingSlot({ text: "Pode ser 16:00", timeZone: "America/Sao_Paulo", availableSlots: slots })).toBeNull();
    expect(selectTrustedN8nAgentBookingSlot({ text: "9h ou 10h", timeZone: "America/Sao_Paulo", availableSlots: slots })).toBeNull();
  });
  it("creates only a non-executable explicit confirmation proposal", () => {
    const format = vi.fn(() => "14/10/2026 às 10:00");
    const proposal = createN8nAgentBookingConfirmationProposalFromSelection({ correlationId: "wamid.slot-choice-1", text: "10h", timeZone: "America/Sao_Paulo", availableSlots: slots, format });
    expect(proposal).toMatchObject({ status: "awaiting_explicit_confirmation", dispatchAllowed: false, bookingExecutionAllowed: false, selectedSlot: { startsAt: slots[1]!.startsAt } });
    expect(proposal?.text).toContain("SIM");
  });
});
