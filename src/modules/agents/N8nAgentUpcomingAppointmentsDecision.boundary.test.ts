import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.service.ts", "utf8");
const decision = readFileSync("src/modules/agents/n8n/N8nAgentUpcomingAppointmentsDecision.ts", "utf8");
describe("n8n agent upcoming appointments decision boundary", () => {
  it("uses a bounded read-only tool contract", () => { expect(schema).toContain("scheduling.list_upcoming_appointments"); expect(schema).toContain("UpcomingAppointmentsArgumentsSchema"); expect(schema).toContain("upcoming_appointments_required"); expect(decision).toContain("toolArguments: { limit: 5 }"); });
  it("repairs provider output deterministically without mutations", () => { expect(service).toContain("groundN8nAgentUpcomingAppointmentsDecision"); expect(service).toContain("scheduling.list_upcoming_appointments"); expect(service).toContain("limit 5"); for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment", "OutboxPublisher"]) expect(decision + service).not.toContain(forbidden); });
});
