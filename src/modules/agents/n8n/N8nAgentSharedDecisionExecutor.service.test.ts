import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentSharedDecision } from "./N8nAgentSharedDecisionExecutor.service";

const mirrorInput = {
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b",
  senderPhoneE164: "+555492056187",
  providerMessageId: "wamid.shared-decision",
  text: "09:00",
  receivedAt: new Date("2026-11-11T12:00:00.000Z"),
};

describe("n8n agent shared decision executor", () => {
  it.each(["whatsapp_text", "whatsapp_audio", "homologation"] as const)("executes the same contextual decision for %s", async (source) => {
    const mirrorResult = { ok: true as const, skipped: false as const };
    const resolveContext = vi.fn().mockResolvedValue({ text: "Solicitação anterior: consulta\nEscolha de horário do cliente: 09:00", continued: true });
    const mirror = vi.fn().mockResolvedValue(mirrorResult);
    const record = vi.fn().mockResolvedValue(undefined);
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(125);
    const result = await executeN8nAgentSharedDecision({ source, mirrorInput }, { resolveContext, mirror, record, clock } as never);
    expect(mirror).toHaveBeenCalledWith({ ...mirrorInput, text: "Solicitação anterior: consulta\nEscolha de horário do cliente: 09:00" });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ companyId: mirrorInput.companyId, correlationId: mirrorInput.providerMessageId, durationMs: 25, contextContinued: true }));
    expect(result).toEqual({ result: mirrorResult, contextContinued: true, source });
  });

  it("keeps the current message when contextual lookup fails", async () => {
    const mirror = vi.fn().mockResolvedValue({ ok: false as const, error: "shadow_transport_failed" as const });
    await executeN8nAgentSharedDecision({ source: "whatsapp_audio", mirrorInput }, {
      resolveContext: vi.fn().mockRejectedValue(new Error("unavailable")),
      mirror,
      record: vi.fn().mockResolvedValue(undefined),
      clock: vi.fn().mockReturnValue(100),
    } as never);
    expect(mirror).toHaveBeenCalledWith(mirrorInput);
  });
});
