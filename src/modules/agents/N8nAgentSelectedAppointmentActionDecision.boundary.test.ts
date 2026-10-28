import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");

describe("n8n agent selected appointment action decision boundary", () => {
  it("requests only the trusted read-only action resolver", () => {
    for (const value of ["scheduling.resolve_selected_appointment_action", "selected_appointment_action_required", "groundN8nAgentSelectedAppointmentActionDecision"]) expect(schema + service).toContain(value);
  });
  it("does not cancel reschedule send route or persist", () => {
    const decision = readFileSync("src/modules/agents/n8n/N8nAgentSelectedAppointmentActionDecision.ts", "utf8");
    for (const forbidden of ["cancelAppointment(", "rescheduleAppointment(", "sendWhatsApp", "OutboxPublisher", "db()", "Proposal"]) expect(decision).not.toContain(forbidden);
  });
});
