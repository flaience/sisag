import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8");
const proposal = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposal.ts", "utf8");
describe("n8n agent shadow v9 cancellation intent", () => {
  it("uses the same deterministic token detector in code and workflow", () => { for (const source of [workflow, proposal]) { expect(source).toContain("split(/[^a-z]+/)"); expect(source.includes('"cancelar"') || source.includes("'cancelar'")).toBe(true); } });
  it("keeps cancellation non-routable and non-executable", () => { expect(workflow).toContain("dispatchAllowed: false"); expect(workflow).toContain("cancellationExecutionAllowed: false"); });
});
