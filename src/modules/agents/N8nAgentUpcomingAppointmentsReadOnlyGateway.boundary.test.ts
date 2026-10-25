import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { N8nAgentReadOnlyGatewaySchema } from "./n8n/N8nAgentReadOnlyGateway.schema";
import { evaluateN8nAgentTool } from "./n8n/N8nAgentToolPolicy";

const route = readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const base = { request: { policyVersion: "n8n_agent_foundation_v1", trustedContext: { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554992056187", correlationId: "wamid.upcoming-1", receivedAt: "2026-10-24T12:00:00Z", timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.upcoming-1", text: "Quais são meus próximos agendamentos?" } }, toolCall: { name: "scheduling.list_upcoming_appointments", arguments: { limit: 5 } } };

describe("n8n agent upcoming appointments read-only gateway boundary", () => {
  it("accepts only a bounded read-only request", () => { expect(N8nAgentReadOnlyGatewaySchema.safeParse(base).success).toBe(true); expect(N8nAgentReadOnlyGatewaySchema.safeParse({ ...base, toolCall: { ...base.toolCall, arguments: { limit: 6 } } }).success).toBe(false); expect(N8nAgentReadOnlyGatewaySchema.safeParse({ ...base, toolCall: { ...base.toolCall, arguments: { limit: 5, companyId: "other" } } }).success).toBe(false); expect(evaluateN8nAgentTool("scheduling.list_upcoming_appointments")).toEqual({ allowed: true, execution: "read_only", requiresConfirmation: false }); });
  it("uses trusted identity and does not send or mutate", () => { expect(route).toContain("listN8nAgentUpcomingAppointments"); expect(route).toContain("parsedBody.data.request.trustedContext.senderPhoneE164"); for (const forbidden of ["OutboxPublisher", "cancelAppointment", "rescheduleAppointment", "createAppointment"]) expect(route).not.toContain(forbidden); });
});
