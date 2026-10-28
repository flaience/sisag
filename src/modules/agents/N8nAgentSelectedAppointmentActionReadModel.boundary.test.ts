import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentSelectedAppointmentActionReadModel.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent selected appointment action read model boundary", () => {
  it("combines only the trusted upcoming list with the pure action resolver", () => {
    for (const value of ["listN8nAgentUpcomingAppointments", "resolveN8nAgentSelectedAppointmentAction", "companyId: input.companyId", "senderPhoneE164: input.senderPhoneE164", "limit: 5", "result.appointments.slice(0, 5)"]) expect(source).toContain(value);
  });

  it("returns no target when the action cannot be resolved uniquely", () => {
    for (const value of ['status: "not_resolved"', "action: null", "appointment: null"]) expect(source).toContain(value);
    expect(source).not.toContain("appointmentId: input");
  });

  it("does not persist propose route send cancel or reschedule yet", () => {
    for (const forbidden of ["getDb", "OutboxPublisher", "Proposal", "routeN8nAgent", "sendWhatsApp", "cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(source).not.toContain(forbidden);
    expect(webhook).not.toContain("resolveN8nAgentSelectedAppointmentActionReadModel");
  });
});
