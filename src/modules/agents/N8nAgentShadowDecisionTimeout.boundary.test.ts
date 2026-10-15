import fs from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const decision = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");
const mirror = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirror.service.ts", "utf8");

describe("n8n agent shadow decision timeout boundary", () => {
  it("allows the model fifteen seconds in production", () => {
    expect(deploy).toContain("N8N_AGENT_SHADOW_TIMEOUT_MS=15000");
    expect(decision).toContain("Math.min(Math.max(dependencies.timeoutMs ?? 8000, 1000), 20000)");
  });

  it("keeps the complete transport window larger and bounded", () => {
    expect(deploy).toContain("N8N_AGENT_SHADOW_MIRROR_TIMEOUT_MS=30000");
    expect(mirror).toContain("Math.min(Math.max(configured, 10_000), 30_000)");
  });

  it("keeps technical provider failures out of explicit human handoff", () => {
    const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffRouting.service.ts", "utf8");
    expect(routing).toContain('input.decision.reasonCode !== "handoff_required"');
  });
});
