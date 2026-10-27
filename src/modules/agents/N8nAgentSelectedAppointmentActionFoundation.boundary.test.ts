import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentSelectedAppointmentAction.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent selected appointment action foundation", () => {
  it("combines one explicit action with one trusted bounded selection", () => {
    for (const value of ["selectTrustedN8nAgentAppointment", "isExplicitN8nAgentAppointmentSelection", 'action: "cancel" | "reschedule"', "appointments.slice(0, 5)", "cancellation === rescheduling"]) expect(source).toContain(value);
  });

  it("does not read persist propose route send or mutate", () => {
    for (const forbidden of ["getDb", "OutboxPublisher", "Proposal", "routeN8nAgent", "sendWhatsApp", "cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(source).not.toContain(forbidden);
    expect(webhook).not.toContain("resolveN8nAgentSelectedAppointmentAction");
  });
});
