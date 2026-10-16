import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync("automation/n8n/workflows/sisag-agent-shadow-v9.json", "utf8");
const decision = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationDecision.ts", "utf8");

describe("n8n agent shadow v9 booking cancellation proposal boundary", () => {
  it("resolves cancellation through the trusted read-only appointment lookup", () => {
    expect(decision).toContain('toolName: "scheduling.explain_appointment_status"');
    expect(decision).toContain("appointmentId: null");
    expect(workflow).toContain("scheduling.explain_appointment_status");
  });
  it("creates only an explicit non-routable non-executable proposal", () => {
    expect(workflow).toContain("bookingCancellationProposal");
    expect(workflow).toContain("awaiting_explicit_confirmation");
    expect(workflow).toContain('dispatchAllowed: false');
    expect(workflow).toContain('cancellationExecutionAllowed: false');
  });
  it("does not call a cancellation mutation", () => {
    expect(workflow).not.toContain("cancelAppointment");
    expect(workflow).not.toContain("cancel-appointment");
    expect(workflow).not.toContain("cancelById");
  });
});
