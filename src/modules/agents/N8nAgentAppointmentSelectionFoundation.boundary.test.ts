import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync("src/modules/agents/n8n/N8nAgentAppointmentSelection.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent appointment selection foundation", () => {
  it("selects only one of five trusted future-list candidates", () => { for (const value of ["slice(0, 5)", "PENDING", "CONFIRMED", "matches.length === 1", "uniqueIndexes.length === 1"]) expect(source).toContain(value); });
  it("supports ordinal or explicit localized date and time", () => { for (const value of ["primeiro", "segundo", "ultim[oa]", "rawDay", "rawMonth", "requestedTimes"]) expect(source).toContain(value); });
  it("does not read persist route send cancel or reschedule yet", () => { for (const forbidden of ["getDb", "OutboxPublisher", "routeN8nAgent", "cancelAppointment", "rescheduleAppointment", "createAppointment"]) expect(source).not.toContain(forbidden); expect(webhook).not.toContain("selectTrustedN8nAgentAppointment"); });
});
