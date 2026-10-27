import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const decision = readFileSync("src/modules/agents/n8n/N8nAgentAppointmentSelectionDecision.ts", "utf8");
const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent appointment selection decision boundary", () => {
  it("requests only the empty read-only selection tool", () => {
    for (const value of ["scheduling.select_appointment", "toolArguments: {}", "appointment_selection_required", "isExplicitN8nAgentAppointmentSelection"]) expect(decision).toContain(value);
    expect(schema).toContain("AppointmentSelectionArgumentsSchema");
  });

  it("repairs invalid provider output before generic availability handling", () => {
    const selection = service.indexOf("groundN8nAgentAppointmentSelectionDecision");
    const availability = service.indexOf("if (!isN8nAgentAvailabilityIntent");
    expect(selection).toBeGreaterThan(-1);
    expect(availability).toBeGreaterThan(selection);
  });

  it("does not execute send cancel reschedule or create", () => {
    for (const forbidden of ["getDb", "OutboxPublisher", "sendWhatsApp", "cancelAppointment", "rescheduleAppointment", "createAppointment"]) expect(decision).not.toContain(forbidden);
  });
});
