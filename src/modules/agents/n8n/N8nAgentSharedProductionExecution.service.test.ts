import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentSharedProductionMessage } from "./N8nAgentSharedProductionExecution.service";

const message = { source: "whatsapp_audio" as const, mirrorInput: { companyId: "company", whatsappAccountId: "account", senderPhoneE164: "+5554999999999", providerMessageId: "wamid-audio", text: "quero agendar", receivedAt: new Date("2026-11-12T12:00:00.000Z") } };
const dependencies = () => ({ mirrorEnabled: vi.fn(() => true), routingEnabled: vi.fn(() => true), executeDecision: vi.fn(async () => ({ result: { ok: true, skipped: false }, contextContinued: false, source: "whatsapp_audio" })), routeResult: vi.fn(async () => ({ handled: true })) });

describe("n8n agent shared production execution", () => {
  it("does not call the fallback after a handled shared result", async () => {
    const deps = dependencies();
    const fallback = vi.fn(async () => ({ ok: true }));
    await expect(executeN8nAgentSharedProductionMessage(message, fallback, deps as never)).resolves.toEqual({ ok: true, handledBy: "n8n_agent" });
    expect(deps.executeDecision).toHaveBeenCalledWith(message);
    expect(deps.routeResult).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company", whatsappAccountId: "account", toPhone: "+5554999999999", correlationId: "wamid-audio" }));
    expect(fallback).not.toHaveBeenCalled();
  });

  it("uses the existing fallback when disabled unhandled or unavailable", async () => {
    for (const configure of [
      (deps: ReturnType<typeof dependencies>) => deps.mirrorEnabled.mockReturnValue(false),
      (deps: ReturnType<typeof dependencies>) => deps.routeResult.mockResolvedValue({ handled: false }),
      (deps: ReturnType<typeof dependencies>) => deps.executeDecision.mockRejectedValue(new Error("unavailable")),
    ]) {
      const deps = dependencies(); configure(deps);
      const fallback = vi.fn(async () => ({ ok: true }));
      await expect(executeN8nAgentSharedProductionMessage(message, fallback, deps as never)).resolves.toEqual({ ok: true, handledBy: "fallback" });
      expect(fallback).toHaveBeenCalledWith(message);
    }
  });
});
