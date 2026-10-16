import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const proposal = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposal.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking cancellation proposal boundary", () => {
  it("requires explicit intent and one trusted future active appointment", () => {
    expect(proposal).toContain("isExplicitN8nAgentBookingCancellationIntent");
    expect(proposal).toContain("startsAt <= input.now");
    expect(proposal).toContain("cancellableStatuses");
  });

  it("is idempotent and non-executable", () => {
    expect(proposal).toContain("conversation:n8n:cancellation:");
    expect(proposal).toContain("dispatchAllowed: false");
    expect(proposal).toContain("cancellationExecutionAllowed: false");
    expect(proposal).not.toContain("cancelAppointment(");
    expect(proposal).not.toContain("cancelById(");
  });

  it("is not integrated into production yet", () => {
    expect(webhook).not.toContain("createN8nAgentBookingCancellationProposal");
  });
});
