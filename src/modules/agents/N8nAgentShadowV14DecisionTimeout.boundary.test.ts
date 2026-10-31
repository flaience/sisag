import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v14.json", "utf8"));

describe("n8n agent shadow v14 decision timeout boundary", () => {
  it("allows the shadow decision to finish inside the outer mirror deadline", () => {
    const nodes = workflow.nodes.filter((node: { name?: string }) => node.name === "Call SISAG Shadow Decision");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].parameters.options.timeout).toBe(25_000);
    expect(nodes[0].parameters.options.timeout).toBeLessThan(30_000);
  });
});
