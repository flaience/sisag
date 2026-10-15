import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/settings/agent-handoffs/page.tsx", "utf8");
const settings = fs.readFileSync("src/app/admin/settings/page.tsx", "utf8");
const route = fs.readFileSync("src/app/api/v1/settings/agent-shadow/handoffs/route.ts", "utf8");

describe("n8n agent human handoff management ui boundary", () => {
  it("is discoverable from settings", () => {
    expect(settings).toContain("Atendimentos humanos");
    expect(settings).toContain("/admin/settings/agent-handoffs");
  });
  it("does not expose operator identifiers to the browser", () => {
    expect(route).toContain("claimedByCurrentUser");
    expect(route).toContain("resolvedByCurrentUser");
    expect(route).toContain("({ claimedBy, resolvedBy, ...item })");
    expect(page).not.toContain("claimedBy:");
    expect(page).not.toContain("resolvedBy:");
  });
  it("does not activate routing or send messages", () => {
    for (const forbidden of ["N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED", "whatsapp.send.requested", "outbox"]) expect(page + settings).not.toContain(forbidden);
  });
});