import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { N8nAgentReadOnlyGatewaySchema } from "./n8n/N8nAgentReadOnlyGateway.schema";
import { evaluateN8nAgentTool } from "./n8n/N8nAgentToolPolicy";

const route = readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const input = {
  request: {
    policyVersion: "n8n_agent_foundation_v1",
    trustedContext: { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554992056187", correlationId: "wamid.selected-action-1", receivedAt: "2026-10-28T12:00:00Z", timeZone: "America/Sao_Paulo" },
    message: { providerMessageId: "wamid.selected-action-1", text: "cancele o segundo" },
  },
  toolCall: { name: "scheduling.resolve_selected_appointment_action", arguments: {} },
};

describe("n8n agent selected appointment action read-only gateway", () => {
  it("accepts only the empty read-only action resolution contract", () => {
    expect(N8nAgentReadOnlyGatewaySchema.safeParse(input).success).toBe(true);
    expect(N8nAgentReadOnlyGatewaySchema.safeParse({ ...input, toolCall: { ...input.toolCall, arguments: { appointmentId: "22222222-2222-4222-8222-222222222222", action: "cancel" } } }).success).toBe(false);
    expect(evaluateN8nAgentTool("scheduling.resolve_selected_appointment_action")).toEqual({ allowed: true, execution: "read_only", requiresConfirmation: false });
  });

  it("derives identity message time zone and reference time from the trusted request", () => {
    for (const value of ["resolveN8nAgentSelectedAppointmentActionReadModel", "trusted.trustedContext.senderPhoneE164", "trusted.message.text", "trusted.trustedContext.timeZone", "trusted.trustedContext.receivedAt"]) expect(route).toContain(value);
  });

  it("does not propose route send cancel or reschedule", () => {
    const start = route.indexOf('if (toolCall.name === "scheduling.resolve_selected_appointment_action")');
    const end = route.indexOf("const target =", start);
    const branch = route.slice(start, end);
    for (const forbidden of ["Proposal", "OutboxPublisher", "sendWhatsApp", "cancelAppointment(", "rescheduleAppointment(", "createAppointment("]) expect(branch).not.toContain(forbidden);
  });
});
