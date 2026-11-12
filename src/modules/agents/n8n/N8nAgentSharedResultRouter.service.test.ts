import { describe, expect, it, vi } from "vitest";
import { routeN8nAgentSharedResult } from "./N8nAgentSharedResultRouter.service";

const input = { companyId: "company", whatsappAccountId: "account", toPhone: "+5554999999999", correlationId: "wamid-result", result: { ok: true, skipped: false, decision: { action: "request_read_only_tool", toolName: "scheduling.find_available_slots", reasonCode: "availability_required", confidence: 1 }, toolObservation: { requested: true, status: "succeeded", errorCode: null, policyVersion: "n8n_agent_foundation_v1" }, answerCandidate: { kind: "availability", status: "ready", text: "08:00", slotCount: 1, source: "read_only_tool" }, bookingConfirmationProposal: null, bookingCancellationProposal: null, bookingReschedulingProposal: null } };

const dependencies = () => ({
  answerEnabled: vi.fn(() => true), handoffEnabled: vi.fn(() => true), cancellationEnabled: vi.fn(() => true), reschedulingEnabled: vi.fn(() => true), bookingEnabled: vi.fn(() => true),
  routeAnswer: vi.fn(async () => ({ handled: true })), routeHandoff: vi.fn(async () => ({ handled: false })), routeCancellation: vi.fn(async () => ({ handled: false })), routeRescheduling: vi.fn(async () => ({ handled: false })), routeBooking: vi.fn(async () => ({ handled: false })),
});

describe("n8n agent shared result router", () => {
  it("routes one answer for a successful shared decision", async () => {
    const deps = dependencies();
    await expect(routeN8nAgentSharedResult(input as never, deps as never)).resolves.toEqual({ handled: true });
    expect(deps.routeHandoff).toHaveBeenCalledOnce();
    expect(deps.routeAnswer).toHaveBeenCalledOnce();
  });

  it("stops after the first handled higher-priority outcome", async () => {
    const deps = dependencies();
    deps.routeHandoff.mockResolvedValue({ handled: true });
    await routeN8nAgentSharedResult(input as never, deps as never);
    expect(deps.routeAnswer).not.toHaveBeenCalled();
    expect(deps.routeCancellation).not.toHaveBeenCalled();
    expect(deps.routeRescheduling).not.toHaveBeenCalled();
  });
});
