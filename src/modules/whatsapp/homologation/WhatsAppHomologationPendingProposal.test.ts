import { describe, expect, it } from "vitest";
import { resolveWhatsAppHomologationPendingProposal } from "./WhatsAppHomologationPendingProposal";

describe("whatsapp homologation pending proposal", () => {
  it.each([
    ["booking_confirmation", "criado"],
    ["booking_cancellation", "cancelado"],
    ["booking_rescheduling", "remarcado"],
  ] as const)("previews confirmation without executing %s", (proposalKind, expected) => {
    const result = resolveWhatsAppHomologationPendingProposal({ text: "SIM", proposalKind });
    expect(result).toMatchObject({ accepted: true });
    expect(result?.text).toContain(expected);
    expect(result?.text).toContain("Nenhuma alteração foi realizada");
  });

  it("previews rejection and keeps the current state", () => {
    expect(resolveWhatsAppHomologationPendingProposal({ text: "não", proposalKind: "booking_rescheduling" })).toEqual({ accepted: false, text: "Recusa reconhecida. Em produção, o horário atual seria mantido. Nenhuma alteração foi realizada." });
  });

  it.each(["talvez", "confirmo", "pode ser", ""])("does not infer an ambiguous answer: %s", (text) => {
    expect(resolveWhatsAppHomologationPendingProposal({ text, proposalKind: "booking_confirmation" })).toBeNull();
  });
});
