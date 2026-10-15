import fs from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffRouting.service.ts", "utf8");
const state = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffState.service.ts", "utf8");
const management = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffManagement.service.ts", "utf8");
const page = fs.readFileSync("src/app/admin/settings/agent-handoffs/page.tsx", "utf8");

describe("n8n agent human handoff production activation boundary", () => {
  it("activates the guarded routing exactly once", () => {
    expect(deploy.match(/N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED=true/g)).toHaveLength(1);
    expect(routing).toContain('process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED === "true"');
    expect(routing).toContain('input.decision.action !== "handoff"');
  });

  it("suspends only the affected conversation before all automatic paths", () => {
    const suspension = route.indexOf("shouldSuspendN8nAgentConversation");
    expect(suspension).toBeGreaterThan(0);
    expect(route).toContain("if (suspended) continue");
    expect(suspension).toBeLessThan(route.indexOf("routeN8nAgentBookingConfirmationDecision", suspension));
    expect(suspension).toBeLessThan(route.indexOf("mirrorN8nAgentShadowMessage", suspension));
  });

  it("publishes one neutral notification and keeps management authenticated and atomic", () => {
    expect(state).toContain("getDb().transaction(async tx");
    expect(state).toContain("dedupeKey:");
    expect(state).toContain("wa_send:handoff:");
    expect(management).toContain('status: "claimed", claimedBy: input.actorId');
    expect(management).toContain('eq(n8nAgentHumanHandoffStates.claimedBy, input.actorId)');
    expect(page).toContain("Abrir WhatsApp");
  });

  it("does not weaken booking execution safeguards", () => {
    expect(deploy).toContain("N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true");
    expect(routing).not.toContain("executeBookingCommand");
  });
});
