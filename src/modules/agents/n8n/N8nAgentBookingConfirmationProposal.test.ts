import { describe, expect, it, vi } from "vitest";
import { createN8nAgentBookingConfirmationProposal } from "./N8nAgentBookingConfirmationProposal";

const serviceId = "22222222-2222-4222-8222-222222222222";
const slot = { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T12:30:00.000Z", serviceId, professionalId: "33333333-3333-4333-8333-333333333333", unitId: "44444444-4444-4444-8444-444444444444" };
const base = { correlationId: "wamid.proposal-1", serviceId, selectedStartTime: slot.startsAt, availableSlots: [slot], format: () => "14/10/2026 09:00" };

describe("n8n agent booking confirmation proposal", () => {
  it("creates an idempotent draft only from one trusted available slot", () => {
    expect(createN8nAgentBookingConfirmationProposal(base)).toEqual(expect.objectContaining({ kind: "booking_confirmation", status: "awaiting_explicit_confirmation", draft: { serviceId, startTime: slot.startsAt, requestId: "conversation:n8n:wamid.proposal-1:" + slot.startsAt }, selectedSlot: slot, dispatchAllowed: false, bookingExecutionAllowed: false }));
  });
  it("asks for explicit SIM or NÃO", () => {
    const result = createN8nAgentBookingConfirmationProposal(base);
    expect(result?.text).toContain("Posso confirmar este agendamento?");
    expect(result?.text).toContain("Responda *SIM*");
    expect(result?.text).toContain("*NÃO*");
  });
  it("rejects invented, ambiguous, mismatched and invalid slots", () => {
    expect(createN8nAgentBookingConfirmationProposal({ ...base, selectedStartTime: "2026-10-14T13:00:00.000Z" })).toBeNull();
    expect(createN8nAgentBookingConfirmationProposal({ ...base, availableSlots: [slot, { ...slot }] })).toBeNull();
    expect(createN8nAgentBookingConfirmationProposal({ ...base, serviceId: "55555555-5555-4555-8555-555555555555" })).toBeNull();
    expect(createN8nAgentBookingConfirmationProposal({ ...base, availableSlots: [{ ...slot, endsAt: slot.startsAt }] })).toBeNull();
  });
  it("formats only after validating the trusted slot", () => {
    const format = vi.fn(() => "14/10/2026 09:00");
    createN8nAgentBookingConfirmationProposal({ ...base, format });
    expect(format).toHaveBeenCalledOnce();
    const invalidFormat = vi.fn(() => "never");
    createN8nAgentBookingConfirmationProposal({ ...base, selectedStartTime: "invalid", format: invalidFormat });
    expect(invalidFormat).not.toHaveBeenCalled();
  });
});
