import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingReadModel.service.ts", "utf8");
const gateway = readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");

describe("n8n agent booking rescheduling read model boundary", () => {
  it("uses trusted tenant and normalized sender identity", () => {
    expect(service).toContain("normalizePhoneE164(input.senderPhoneE164)");
    expect(service).toContain("companyId: input.companyId");
    expect(service).toContain("serviceId: resolved.appointment.serviceId");
  });

  it("returns only the current appointment and bounded future slots", () => {
    expect(service).toContain("31 * 24 * 60 * 60 * 1000");
    expect(service).toContain("Math.min(Math.max(input.limit ?? 20, 1), 20)");
    expect(service).toContain("slot.startsAt !== appointmentStart.toISOString()");
  });

  it("does not write reschedule or expose the read model through production yet", () => {
    for (const forbidden of ["rescheduleById", "rescheduleAppointment", "update(", "insert(", "delete("]) expect(service).not.toContain(forbidden);
    expect(gateway).not.toContain("prepareN8nAgentBookingReschedulingReadModel");
  });
});
