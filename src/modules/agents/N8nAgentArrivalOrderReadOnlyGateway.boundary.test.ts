import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentReadOnlyGateway } from "./n8n/N8nAgentReadOnlyGateway.service";
import { evaluateN8nAgentTool } from "./n8n/N8nAgentToolPolicy";

const request = {
  policyVersion: "n8n_agent_foundation_v1",
  trustedContext: { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554999999999", correlationId: "wamid.arrival.gateway", receivedAt: "2026-11-22T12:00:00.000Z", timeZone: "America/Sao_Paulo" },
  message: { providerMessageId: "wamid.arrival.gateway", text: "Quero atendimento por ordem de chegada amanhã de manhã" },
};

describe("n8n agent arrival order read-only gateway boundary", () => {
  const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
  it("allowlists a closed read-only tool contract", async () => {
    expect(evaluateN8nAgentTool("scheduling.list_arrival_periods")).toEqual({ allowed: true, execution: "read_only", requiresConfirmation: false });
    const execute = vi.fn().mockResolvedValue({ ok: true, periods: [] });
    const result = await executeN8nAgentReadOnlyGateway({ request, toolCall: { name: "scheduling.list_arrival_periods", arguments: { attendanceDate: "2026-11-23", dayPeriod: "morning", serviceText: null } } }, { retrieveKnowledge: vi.fn().mockResolvedValue([]), execute });
    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ companyId: request.trustedContext.companyId, correlationId: request.trustedContext.correlationId }));
  });
  it("rejects mutation fields and invalid dates", async () => {
    const dependencies = { retrieveKnowledge: vi.fn(), execute: vi.fn() };
    for (const argumentsValue of [{ attendanceDate: "23/11/2026", dayPeriod: null, serviceText: null }, { attendanceDate: "2026-11-23", dayPeriod: null, serviceText: null, register: true }]) {
      await expect(executeN8nAgentReadOnlyGateway({ request, toolCall: { name: "scheduling.list_arrival_periods", arguments: argumentsValue } }, dependencies)).resolves.toEqual({ ok: false, error: "invalid_gateway_request" });
    }
    expect(dependencies.execute).not.toHaveBeenCalled();
  });
  it("routes only trusted company data to the read model without mutations", () => {
    expect(route).toContain("listN8nAgentArrivalOrderPeriods({ companyId");
    const branch = route.slice(route.indexOf('if (toolCall.name === "scheduling.list_arrival_periods")'), route.indexOf("const target =", route.indexOf('if (toolCall.name === "scheduling.list_arrival_periods")')));
    for (const value of ["registerArrivalIntention", "cancelArrivalIntention", "insert(", "update("]) expect(branch).not.toContain(value);
  });
});
