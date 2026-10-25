import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync("src/modules/agents/n8n/N8nAgentUpcomingAppointments.service.ts", "utf8");
describe("n8n agent upcoming appointments boundary", () => {
  it("is tenant identity and future scoped", () => { expect(source).toContain("eq(bookings.companyId, input.companyId)"); expect(source).toContain("eq(clients.companyId, input.companyId)"); expect(source).toContain("eq(clients.phoneE164, input.senderPhoneE164)"); expect(source).toContain("gt(bookings.startTime, input.now)"); expect(source).toContain('["PENDING", "CONFIRMED"]'); });
  it("is bounded and read only", () => { expect(source).toContain("Math.min"); expect(source).toContain("slice(0, limit)"); for (const forbidden of [".insert(", ".update(", ".delete(", "outbox", "cancelAppointment", "rescheduleAppointment"]) expect(source).not.toContain(forbidden); });
  it("does not expose client identity", () => { expect(source).not.toContain("clientName"); expect(source).not.toContain("phoneE164:"); expect(source).not.toContain("notes:"); });
});
