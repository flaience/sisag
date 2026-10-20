import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { N8nAgentReadOnlyGatewaySchema } from "./n8n/N8nAgentReadOnlyGateway.schema";
import { evaluateN8nAgentTool } from "./n8n/N8nAgentToolPolicy";

const route = readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const schema = readFileSync("src/modules/agents/n8n/N8nAgentReadOnlyGateway.schema.ts", "utf8");
const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const input = { request: { policyVersion: "n8n_agent_foundation_v1", trustedContext: { companyId, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554992056187", correlationId: "wamid.rescheduling-gateway-1", receivedAt: "2026-10-20T12:00:00Z", timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.rescheduling-gateway-1", text: "Quero remarcar" } }, toolCall: { name: "scheduling.prepare_rescheduling", arguments: { dateFrom: "2026-10-21T03:00:00.000Z", dateTo: "2026-10-28T03:00:00.000Z", limit: 20 } } };

describe("n8n agent booking rescheduling read-only gateway", () => {
  it("accepts the bounded preparation tool as read only", () => {
    expect(N8nAgentReadOnlyGatewaySchema.safeParse(input).success).toBe(true);
    expect(evaluateN8nAgentTool("scheduling.prepare_rescheduling")).toEqual({ allowed: true, execution: "read_only", requiresConfirmation: false });
  });

  it("rejects excessive limits and extra targeting fields", () => {
    expect(N8nAgentReadOnlyGatewaySchema.safeParse({ ...input, toolCall: { ...input.toolCall, arguments: { ...input.toolCall.arguments, limit: 21 } } }).success).toBe(false);
    expect(N8nAgentReadOnlyGatewaySchema.safeParse({ ...input, toolCall: { ...input.toolCall, arguments: { ...input.toolCall.arguments, appointmentId: "22222222-2222-4222-8222-222222222222" } } }).success).toBe(false);
  });

  it("derives appointment identity and service inside the authenticated route", () => {
    expect(route).toContain("prepareN8nAgentBookingReschedulingReadModel");
    expect(route).toContain("resolveN8nAgentAppointmentStatusTarget");
    expect(route).toContain("serviceId: item.serviceId");
    expect(route).toContain("adapter.findAvailableSlots");
  });

  it("does not call the rescheduling mutation", () => {
    expect(schema).not.toContain("scheduling.reschedule_appointment");
    expect(route).not.toContain("adapter.rescheduleAppointment");
  });
});
