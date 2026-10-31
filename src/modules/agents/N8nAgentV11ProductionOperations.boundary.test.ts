import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const manual = readFileSync("docs/n8n-agent-operations-manual.md", "utf8");
describe("n8n agent v11 production operations", () => {
  it("documents workflow list routing and safe observability", () => { for (const value of ["SISAG Agent Shadow v14", "sisag-agent-shadow-v14.json", "scheduling.list_upcoming_appointments", "N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED=true", "n8n_agent_upcoming_appointments_routing"]) expect(manual).toContain(value); });
  it("documents the Meta production prerequisites learned in validation", () => { for (const value of ["politica-de-privacidade", "WhatsApp Business Account", "messages", "whatsapp_webhook_events"]) expect(manual).toContain(value); });
});
