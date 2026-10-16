import fs from "node:fs";
import { describe, expect, it } from "vitest";

const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");

describe("n8n agent successful answer candidate routing boundary", () => {
  it("allows successful ready and empty read-only outcomes", () => {
    for (const value of ['status === "succeeded"', 'candidate.status === "ready"', 'candidate.status === "empty"', "candidate.slotCount > 0", "candidate.slotCount === 0"]) expect(service).toContain(value);
  });

  it("keeps the resource clarification as the only routed failure", () => {
    for (const value of ['status === "failed"', 'errorCode === "SCHEDULING_RESOURCE_NOT_FOUND"', 'candidate.status === "clarify"']) expect(service).toContain(value);
  });

  it("requires an actual read-only request and does not mutate scheduling", () => {
    expect(service).toContain("requested === true");
    expect(service).toContain('toolName === "scheduling.find_available_slots"');
    expect(service).not.toContain("createAppointment");
    expect(service).not.toContain("cancelAppointment");
  });
});
