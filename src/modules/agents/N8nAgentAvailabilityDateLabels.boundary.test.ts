import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const candidate = readFileSync("src/modules/agents/n8n/N8nAgentShadowAnswerCandidate.ts", "utf8");
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8");

describe("n8n agent availability date labels boundary", () => {
  it("includes weekday date and time in every displayed availability option", () => {
    for (const source of [candidate, workflow]) {
      expect(source).toContain('weekday');
      expect(source).toContain('day');
      expect(source).toContain('month');
      expect(source).toContain('times');
    }
  });
  it("keeps the displayed list limited to the three selectable options", () => {
    expect(candidate).toContain("slots.slice(0, 3)");
    expect(workflow).toContain("slots.slice(0, 3)");
  });
});
