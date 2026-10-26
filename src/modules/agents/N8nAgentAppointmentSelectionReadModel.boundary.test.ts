import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentAppointmentSelectionReadModel.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent appointment selection read model boundary", () => {
  it("combines only the trusted upcoming list with deterministic selection", () => {
    for (const value of ["listN8nAgentUpcomingAppointments", "selectTrustedN8nAgentAppointment", "companyId: input.companyId", "senderPhoneE164: input.senderPhoneE164", "limit: 5", "timeZone: input.timeZone"]) expect(source).toContain(value);
  });

  it("fails closed without accepting an appointment id from message text", () => {
    for (const value of ["selection_required", "not_found_or_ambiguous", "appointment: null", "result.appointments.slice(0, 5)"]) expect(source).toContain(value);
    expect(source).not.toContain("appointmentId: input");
  });

  it("does not persist route send cancel or reschedule yet", () => {
    for (const forbidden of ["getDb", "OutboxPublisher", "routeN8nAgent", "sendWhatsApp", "cancelAppointment", "rescheduleAppointment", "createAppointment"]) expect(source).not.toContain(forbidden);
    expect(webhook).not.toContain("resolveN8nAgentAppointmentSelectionReadModel");
  });
});
