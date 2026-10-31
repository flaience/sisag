import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");

describe("n8n agent selected appointment action observability", () => {
  it("records sanitized eligibility and delivery outcomes", () => {
    expect(service).toContain('event: "n8n_agent_selected_appointment_action_routing"');
    expect(service).toContain('stage: "eligibility"');
    expect(service).toContain('stage: "delivery"');
    expect(service).toContain('code: "published"');
    expect(service).toContain("safeObservationCode(error)");
  });

  it("does not copy private scheduling data into observations", () => {
    const calls = [...service.matchAll(/dependencies\.observe\(\{ event: "n8n_agent_selected_appointment_action_routing"([^}]*)\}\)/g)]
      .map((match) => match[1])
      .join(" ");
    expect(calls).not.toContain("toPhone");
    expect(calls).not.toContain("candidate.text");
    expect(calls).not.toContain("appointmentId");
    expect(calls).not.toContain("serviceId");
  });
});
