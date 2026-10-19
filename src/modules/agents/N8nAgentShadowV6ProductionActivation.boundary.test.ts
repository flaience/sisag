import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");

describe("n8n agent shadow v6 production activation boundary", () => {
  it("enables only the guarded recent slot context", () => {
    expect(deploy.match(/N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED=true/g)).toHaveLength(1);
    expect(deploy).toContain("N8N_AGENT_SHADOW_MIRROR_ENABLED=true");
  });
  it("does not route the availability list when a proposal exists", () => {
    expect(route).toContain("const bookingConfirmationProposal");
    expect(route).toContain("bookingConfirmationProposal || bookingCancellationProposal ? null");
  });
  it("does not dispatch or execute the proposal", () => {
    expect(route).not.toContain("routeN8nAgentBookingConfirmationProposal");
    expect(route).not.toContain("executeN8nAgentBookingConfirmationProposal");
    expect(route).not.toContain("executeBookingCommand");
  });
});
