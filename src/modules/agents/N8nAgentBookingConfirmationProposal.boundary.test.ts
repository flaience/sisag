import fs from "node:fs";
import { describe, expect, it } from "vitest";

const proposal = fs.readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationProposal.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent booking confirmation proposal boundary", () => {
  it("reuses the official scheduling draft and requires an exact trusted slot", () => {
    expect(proposal).toContain("createAgentSchedulingDraft");
    expect(proposal).toContain("formatDraftConfirmation");
    expect(proposal).toContain("slot.serviceId === input.serviceId");
    expect(proposal).toContain("slot.startsAt === input.selectedStartTime");
    expect(proposal).toContain("matches.length !== 1");
  });
  it("keeps dispatch and booking execution disabled", () => {
    expect(proposal).toContain("dispatchAllowed: false");
    expect(proposal).toContain("bookingExecutionAllowed: false");
    for (const forbidden of ["executeBookingCommand", "BookingService.createAuto", "OutboxPublisher", "outboxInsert"]) expect(proposal).not.toContain(forbidden);
  });
  it("is not connected to the production webhook yet", () => {
    expect(route).not.toContain("N8nAgentBookingConfirmationProposal");
  });
});
