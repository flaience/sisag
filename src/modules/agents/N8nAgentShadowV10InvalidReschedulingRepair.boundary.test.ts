import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent shadow v10 invalid rescheduling repair", () => {
  it("repairs explicit rescheduling before generic availability clarification", () => {
    const grounding = service.indexOf("const explicitlyGrounded = groundN8nAgentBookingReschedulingDecision");
    const availability = service.indexOf("if (!isN8nAgentAvailabilityIntent", grounding);
    expect(grounding).toBeGreaterThan(-1);
    expect(availability).toBeGreaterThan(grounding);
  });

  it("continues to use only the read-only preparation tool", () => {
    expect(service).toContain("groundN8nAgentBookingReschedulingDecision");
    expect(service).not.toContain("rescheduleAppointment(");
    expect(service).not.toContain("rescheduleById(");
  });
});
