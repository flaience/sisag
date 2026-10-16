import fs from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v8.json", "utf8"));
const body = workflow.nodes.find((node: { name: string }) => node.name === "Execute SISAG Read Only Tool")?.parameters?.jsonBody ?? "";
describe("n8n agent shadow v8 tool arguments", () => {
  it("preserves the null appointment id for trusted identity resolution", () => { expect(body).toContain("scheduling.explain_appointment_status"); expect(body).toContain("decision.toolArguments"); });
  it("removes null optional availability fields before the strict gateway", () => { expect(body).toContain("Object.fromEntries"); expect(body).toContain("value !== null"); expect(body).toContain("value !== undefined"); });
  it("continues to call only the read-only gateway", () => { expect(body).not.toContain("create_appointment"); expect(body).not.toContain("cancel_appointment"); expect(body).not.toContain("reschedule_appointment"); });
});
