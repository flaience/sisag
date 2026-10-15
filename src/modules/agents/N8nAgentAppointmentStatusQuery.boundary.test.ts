import fs from "node:fs";
import { describe, expect, it } from "vitest";

const resolver = fs.readFileSync("src/modules/agents/n8n/N8nAgentAppointmentStatusResolver.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");

describe("n8n agent appointment status query boundary", () => {
  it("resolves only inside trusted tenant and sender identity", () => {
    for (const value of ["eq(clients.companyId, input.companyId)", "eq(clients.phoneE164, input.senderPhoneE164)", "eq(bookings.companyId, input.companyId)", "eq(bookings.clientId, clients.id)"]) expect(resolver).toContain(value);
    expect(route).toContain("request.trustedContext.senderPhoneE164");
  });

  it("accepts an omitted business identifier and selects only the next active appointment", () => {
    expect(schema).toContain("appointmentId: z.string().uuid().nullable()");
    for (const value of ["gt(bookings.startTime, input.now)", 'inArray(bookings.status, ["PENDING", "CONFIRMED"])', "orderBy(asc(bookings.startTime)"]) expect(resolver).toContain(value);
  });

  it("is read-only and does not dispatch or mutate", () => {
    for (const value of ["insert(", "update(", "delete(", "outbox", "executeBookingCommand"]) expect(resolver).not.toContain(value);
    expect(route).toContain("adapter.getAppointmentJourney");
  });
});
