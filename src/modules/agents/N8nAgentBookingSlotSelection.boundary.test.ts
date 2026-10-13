import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/modules/agents/n8n/N8nAgentBookingSlotSelection.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking slot selection boundary", () => {
  it("selects only from trusted availability slots", () => {
    expect(source).toContain("input.availableSlots.filter(validSlot)");
    expect(source).toContain("matches.length === 1");
  });
  it("reuses the explicit confirmation proposal and keeps execution closed", () => {
    expect(source).toContain("createN8nAgentBookingConfirmationProposal");
    expect(source).not.toContain("executeBookingCommand");
    expect(source).not.toContain("OutboxPublisher");
  });
  it("is not connected to the production webhook yet", () => {
    expect(route).not.toContain("selectTrustedN8nAgentBookingSlot");
    expect(route).not.toContain("createN8nAgentBookingConfirmationProposalFromSelection");
  });
});
