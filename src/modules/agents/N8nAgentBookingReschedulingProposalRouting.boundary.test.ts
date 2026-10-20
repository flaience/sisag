import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingProposalRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking rescheduling proposal routing boundary", () => {
  it("is opt-in atomic and question-only", () => { expect(routing).toContain("N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED"); expect(routing).toContain("proposal.dispatchAllowed !== true"); expect(routing).toContain("proposal.reschedulingExecutionAllowed !== false"); expect(routing).toContain("persistN8nAgentBookingReschedulingProposalAndPublish"); expect(state).toContain("wa_send:rescheduling-proposal:"); expect(routing).not.toContain("rescheduleAppointment"); });
  it("suppresses the availability reply when the proposal exists", () => { expect(route).toContain("bookingConfirmationProposal || bookingCancellationProposal || bookingReschedulingProposal ? null"); expect(route).toContain("routeN8nAgentBookingReschedulingProposal"); });
});
