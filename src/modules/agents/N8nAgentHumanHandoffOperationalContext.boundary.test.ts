import fs from "node:fs";
import { describe, expect, it } from "vitest";

const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffManagement.service.ts", "utf8");
const page = fs.readFileSync("src/app/admin/settings/agent-handoffs/page.tsx", "utf8");
const route = fs.readFileSync("src/app/api/v1/settings/agent-shadow/handoffs/route.ts", "utf8");

describe("n8n agent human handoff operational context boundary", () => {
  it("resolves the contact from the official inbound record inside the trusted tenant and account", () => {
    expect(service).toContain("eq(messageLogs.companyId, n8nAgentHumanHandoffStates.companyId)");
    expect(service).toContain("eq(messageLogs.whatsappAccountId, n8nAgentHumanHandoffStates.whatsappAccountId)");
    expect(service).toContain("eq(messageLogs.providerMessageId, n8nAgentHumanHandoffStates.correlationId)");
    expect(service).toContain('eq(messageLogs.status, "received")');
    expect(service).toContain("eq(clients.companyId, input.companyId)");
  });

  it("never reads or returns message content", () => {
    expect(service).not.toContain("messageLogs.body");
    expect(service).not.toContain("requestPayload");
    expect(service).not.toContain("responsePayload");
    expect(route).toContain('requireApiRole(request, ["owner", "admin", "staff"])');
  });

  it("reveals contact action only after the current operator claims the handoff", () => {
    expect(page).toContain('item.status === "claimed" && item.claimedByCurrentUser');
    expect(page).toContain("Abrir WhatsApp");
    expect(page).toContain("maskedContact(item.contactPhoneE164)");
    expect(page).toContain('rel="noreferrer"');
  });

  it("does not activate routing or duplicate identity in the handoff table", () => {
    expect(page + service).not.toContain("N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED");
    expect(service).not.toContain("update(n8nAgentHumanHandoffStates).set({ contactPhoneE164");
  });
});
