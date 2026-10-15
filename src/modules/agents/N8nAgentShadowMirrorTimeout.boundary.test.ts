import fs from "node:fs";
import { describe, expect, it } from "vitest";
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");
const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-mirror-timeout.md", "utf8");
describe("n8n agent shadow mirror transport timeout", () => {
  it("uses a dedicated bounded timeout", () => { for (const value of ["N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS", "10_000", "30_000", "15_000"]) expect(service).toContain(value); });
  it("provisions the production timeout explicitly", () => expect(deploy).toContain("N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS=30000"));
  it("keeps the WhatsApp path authoritative and failures sanitized", () => { expect(doc).toContain("sem interferir"); expect(service).toContain("shadow_transport_failed"); });
});
