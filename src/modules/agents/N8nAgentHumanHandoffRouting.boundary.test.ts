import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffRouting.service.ts", "utf8");
const state = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffState.service.ts", "utf8");

describe("n8n agent human handoff routing boundary", () => {
  it("checks suspension before confirmation, mirror and legacy assistants", () => {
    const suspension = route.indexOf("shouldSuspendN8nAgentConversation");
    expect(suspension).toBeGreaterThan(0);
    expect(suspension).toBeLessThan(route.indexOf("routeN8nAgentBookingConfirmationDecision", suspension));
    expect(suspension).toBeLessThan(route.indexOf("mirrorN8nAgentShadowMessage", suspension));
    expect(route).toContain("if (suspended) continue");
  });

  it("is opt-in and routes only structured handoff decisions", () => {
    expect(routing).toContain("N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED");
    expect(routing).toContain('input.decision.action !== "handoff"');
    expect(routing).toContain('input.decision.toolName !== null');
  });

  it("persists state and one neutral outbox event atomically", () => {
    expect(state).toContain("getDb().transaction(async tx");
    expect(state).toContain("tx.insert(n8nAgentHumanHandoffStates)");
    expect(state).toContain("tx.insert(outbox)");
    expect(state).toContain('dedupeKey: `wa_send:handoff:${input.correlationId}`');
    expect(state).toContain('source: "n8n_agent_handoff_v1"');
  });
});