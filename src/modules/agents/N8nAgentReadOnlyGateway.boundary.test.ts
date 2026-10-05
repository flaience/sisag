import fs from "node:fs";
import { describe, expect, it } from "vitest";
const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentReadOnlyGateway.service.ts", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentReadOnlyGateway.schema.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-read-only-gateway.md", "utf8");
describe("n8n agent read-only gateway boundary", () => {
  it("requires internal authentication and trusted operational context", () => { expect(route).toContain("validateInternalRequest"); expect(route).toContain("createOperationalUseCaseContext"); expect(route).toContain("type: \"agent\""); });
  it("exposes only the two read-only tool shapes", () => { expect(schema).toContain("scheduling.find_available_slots"); expect(schema).toContain("scheduling.explain_appointment_status"); for (const value of ["create_appointment", "cancel_appointment", "reschedule_appointment"]) expect(schema).not.toContain(value); });
  it("checks tenant evidence before execution", () => { expect(service.indexOf("validateN8nAgentEvidenceTenant")).toBeLessThan(service.indexOf("dependencies.execute")); });
  it("does not activate n8n or call model and messaging providers", () => { for (const value of ["OpenAI", "OPENAI_API_KEY", "outbox", "WhatsAppSender", "webhook/sisag"]) expect(route + service).not.toContain(value); expect(doc).toContain("workflow permanece inativo"); });
});
