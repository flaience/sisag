import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v11.json", "utf8"));
const build = workflow.nodes.find((node: { name?: string }) => node.name === "Build Answer And Booking Proposal")?.parameters?.jsCode ?? "";
describe("n8n agent shadow v11 service names", () => {
  it("uses the sanitized serviceNames contract from the trusted read model", () => { expect(build).toContain("Array.isArray(item.serviceNames)"); expect(build).toContain("serviceNames.join(', ')"); expect(build).toContain("slice(0, 3)"); expect(build).toContain("slice(0, 120)"); });
  it("uses a neutral fallback only when no trusted name exists", () => { expect(build).toContain("serviceNames.length > 0 ? serviceNames.join(', ') : 'Atendimento'"); });
});
