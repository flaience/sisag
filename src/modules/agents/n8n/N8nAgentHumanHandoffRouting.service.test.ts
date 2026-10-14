import { afterEach, describe, expect, it, vi } from "vitest";
import { routeN8nAgentHumanHandoff, shouldSuspendN8nAgentConversation } from "./N8nAgentHumanHandoffRouting.service";

const input = { companyId: "company", whatsappAccountId: "account", toPhone: "+5554999996187", correlationId: "wamid.handoff", decision: { action: "handoff" as const, toolName: null, reasonCode: "provider_unavailable", confidence: 0 } };
afterEach(() => { delete process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED; vi.restoreAllMocks(); });

describe("n8n agent human handoff routing", () => {
  it("is disabled by default", async () => {
    const persistAndPublish = vi.fn();
    expect(await routeN8nAgentHumanHandoff(input, { persistAndPublish })).toEqual({ handled: false, reason: "disabled" });
    expect(persistAndPublish).not.toHaveBeenCalled();
  });

  it("persists and publishes only an eligible handoff", async () => {
    process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED = "true";
    const persistAndPublish = vi.fn().mockResolvedValue({ created: true, id: "state" });
    expect(await routeN8nAgentHumanHandoff(input, { persistAndPublish })).toEqual({ handled: true });
    expect(persistAndPublish).toHaveBeenCalledWith(expect.objectContaining({ companyId: input.companyId, correlationId: input.correlationId, reasonCode: "provider_unavailable", text: expect.stringContaining("atendimento humano") }));
  });

  it("rejects non-handoff decisions", async () => {
    process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED = "true";
    const persistAndPublish = vi.fn();
    expect(await routeN8nAgentHumanHandoff({ ...input, decision: { ...input.decision, action: "clarify" } }, { persistAndPublish })).toEqual({ handled: false, reason: "handoff_not_eligible" });
    expect(persistAndPublish).not.toHaveBeenCalled();
  });

  it("suspends only when the persisted state says so", async () => {
    process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED = "true";
    const isSuspended = vi.fn().mockResolvedValue(true);
    await expect(shouldSuspendN8nAgentConversation({ companyId: "company", whatsappAccountId: "account", senderPhoneE164: "+5554999996187" }, { isSuspended })).resolves.toBe(true);
  });
});