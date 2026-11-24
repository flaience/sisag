import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { executeN8nAgentReadOnlyGateway } from "./n8n/N8nAgentReadOnlyGateway.service";
import { evaluateN8nAgentTool } from "./n8n/N8nAgentToolPolicy";

const request = { policyVersion: "n8n_agent_foundation_v1", trustedContext: { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554999999999", correlationId: "wamid.arrival.proposal", receivedAt: "2026-11-24T12:00:00.000Z", timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.arrival.proposal", text: "quero o segundo período" } };

describe("n8n agent arrival intention proposal read-only gateway boundary", () => {
  const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
  it("allowlists a strict read-only preparation contract", async () => {
    expect(evaluateN8nAgentTool("scheduling.prepare_arrival_intention")).toEqual({ allowed: true, execution: "read_only", requiresConfirmation: false });
    const execute = vi.fn().mockResolvedValue({ ok: true, status: "not_resolved", proposal: null, candidateCount: 2 });
    const result = await executeN8nAgentReadOnlyGateway({ request, toolCall: { name: "scheduling.prepare_arrival_intention", arguments: { attendanceDate: "2026-11-30" } } }, { retrieveKnowledge: vi.fn().mockResolvedValue([]), execute });
    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ companyId: request.trustedContext.companyId, correlationId: request.trustedContext.correlationId }));
  });
  it("rejects mutation fields and invalid dates", async () => {
    const dependencies = { retrieveKnowledge: vi.fn(), execute: vi.fn() };
    for (const argumentsValue of [{ attendanceDate: "30/11/2026" }, { attendanceDate: "2026-11-30", periodId: "from-client" }, { attendanceDate: "2026-11-30", register: true }]) await expect(executeN8nAgentReadOnlyGateway({ request, toolCall: { name: "scheduling.prepare_arrival_intention", arguments: argumentsValue } }, dependencies)).resolves.toEqual({ ok: false, error: "invalid_gateway_request" });
    expect(dependencies.execute).not.toHaveBeenCalled();
  });
  it("routes trusted message date company and correlation without mutation", () => {
    const branch = route.slice(route.indexOf('if (toolCall.name === "scheduling.prepare_arrival_intention")'), route.indexOf("const target =", route.indexOf('if (toolCall.name === "scheduling.prepare_arrival_intention")')));
    for (const value of ["resolveN8nAgentArrivalIntentionProposalReadModel", "companyId", "toolCall.arguments.attendanceDate", "trusted.message.text", "trusted.trustedContext.correlationId"]) expect(branch).toContain(value);
    for (const value of ["registerArrivalIntention", "insert(", "update(", "sendWhatsApp", "checkIn"]) expect(branch).not.toContain(value);
  });
});
