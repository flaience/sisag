import { describe, expect, it, vi } from "vitest";
import { createWhatsAppHomologationEnvelope } from "./WhatsAppHomologation";
import { runWhatsAppHomologationShadowDecision } from "./WhatsAppHomologationShadowDecision.service";

const message = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b",
  senderPhoneE164: "+555492056187",
  text: "Quais são meus próximos agendamentos?",
  correlationId: "homolog:decision:1",
};

const complete = {
  ok: true as const,
  skipped: false as const,
  decision: { action: "request_read_only_tool" as const, toolName: "scheduling.list_upcoming_appointments" as const, reasonCode: "upcoming_appointments_required", confidence: 1 },
  execution: { mode: "ai" as const, provider: "openai", model: "gpt-6-luna", promptVersion: "n8n_agent_shadow_decision_v1", durationMs: 10, errorCode: null },
  toolObservation: { requested: true, status: "succeeded" as const, errorCode: null, policyVersion: "n8n_agent_foundation_v1" },
  answerCandidate: { kind: "upcoming_appointments" as const, status: "empty" as const, text: "Você não possui próximos agendamentos.", appointmentCount: 0, source: "read_only_tool" as const },
  bookingConfirmationProposal: null,
  bookingCancellationProposal: null,
  bookingReschedulingProposal: null,
};

describe("whatsapp homologation shadow decision", () => {
  it("runs the existing shadow decision and keeps delivery disabled", async () => {
    const mirror = vi.fn().mockResolvedValue(complete);
    const envelope = createWhatsAppHomologationEnvelope(message);
    const result = await runWhatsAppHomologationShadowDecision(envelope, { mirror, now: () => new Date("2026-11-09T12:00:00.000Z") });
    expect(mirror).toHaveBeenCalledWith(expect.objectContaining({ providerMessageId: "homolog:decision:1", text: message.text }));
    expect(result).toMatchObject({ ok: true, mode: "homologation", externalDispatchAllowed: false, correlationId: "homolog:decision:1", answerCandidate: complete.answerCandidate });
  });

  it.each([
    { ok: true as const, skipped: true as const, reason: "disabled" },
    { ok: true as const, skipped: false as const },
    { ok: false as const, error: "shadow_transport_failed" },
  ])("fails closed when the shadow result cannot be inspected", async (mirrorResult) => {
    const envelope = createWhatsAppHomologationEnvelope(message);
    const result = await runWhatsAppHomologationShadowDecision(envelope, { mirror: vi.fn().mockResolvedValue(mirrorResult), now: () => new Date() });
    expect(result.ok).toBe(false);
  });
});
