import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8"));
const node = workflow.nodes.find((candidate: { name?: string }) => candidate.name === "Record Tool Observation");
const response = workflow.nodes.find((candidate: { name?: string }) => candidate.name === "Respond Shadow Only");

describe("n8n agent shadow v9 cancellation proposal propagation", () => {
  it("preserves the cancellation proposal after recording the tool observation", () => {
    expect(node?.parameters?.jsCode).toContain("bookingCancellationProposal: observed.bookingCancellationProposal ?? null");
  });

  it("returns the preserved cancellation proposal in the webhook response", () => {
    expect(response?.parameters?.responseBody).toContain("bookingCancellationProposal: $json.bookingCancellationProposal ?? null");
  });
});
