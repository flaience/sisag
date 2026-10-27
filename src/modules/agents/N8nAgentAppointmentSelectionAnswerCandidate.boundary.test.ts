import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const candidate = readFileSync("src/modules/agents/n8n/N8nAgentShadowAnswerCandidate.ts", "utf8");
const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v11.json", "utf8");

describe("n8n agent appointment selection answer candidate boundary", () => {
  it("returns only sanitized service date time and status", () => {
    for (const value of ['kind: "appointment_selection"', "serviceNames", "timeZone: input.timeZone", "appointmentStatus", "startsAt"]) expect(candidate).toContain(value);
    expect(schema).toContain('z.literal("appointment_selection")');
  });

  it("does not expose identity appointment id notes or mutation capability", () => {
    const start = candidate.indexOf("export function createAppointmentSelectionAnswerCandidate");
    const selection = candidate.slice(start);
    for (const forbidden of ["senderPhoneE164", "clientName", "appointmentId", "notes", "getDb", "OutboxPublisher", "cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(selection).not.toContain(forbidden);
  });

  it("is not emitted by the production workflow yet", () => {
    expect(workflow).not.toContain("appointment_selection");
  });
});
