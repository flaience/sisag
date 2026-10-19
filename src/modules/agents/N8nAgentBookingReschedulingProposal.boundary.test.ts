import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const proposal = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingProposal.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking rescheduling proposal boundary", () => {
  it("requires explicit intent one trusted future appointment and one exact offered slot", () => {
    expect(proposal).toContain("isExplicitN8nAgentBookingReschedulingIntent");
    expect(proposal).toContain("reschedulableStatuses");
    expect(proposal).toContain("matches.length !== 1");
    expect(proposal).toContain("slot.serviceId === input.appointment.serviceId");
  });

  it("is idempotent non-routable and non-executable", () => {
    expect(proposal).toContain("conversation:n8n:rescheduling:");
    expect(proposal).toContain("dispatchAllowed: false");
    expect(proposal).toContain("reschedulingExecutionAllowed: false");
    expect(proposal).not.toContain("rescheduleById(");
    expect(proposal).not.toContain("reschedule_appointment");
  });

  it("is not integrated into production yet", () => {
    expect(webhook).not.toContain("createN8nAgentBookingReschedulingProposal");
  });
});
