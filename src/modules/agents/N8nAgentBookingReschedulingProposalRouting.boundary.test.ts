import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingProposalRouting.service.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking rescheduling proposal routing boundary", () => {
  it("is opt-in, idempotent and question-only", () => { expect(service).toContain("N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED"); expect(service).toContain("proposal.dispatchAllowed !== true"); expect(service).toContain("proposal.reschedulingExecutionAllowed !== false"); expect(service).toContain("wa_send:rescheduling-proposal:"); expect(service).not.toContain("rescheduleAppointment"); });
  it("suppresses the availability reply when the proposal exists", () => { expect(route).toContain("bookingConfirmationProposal || bookingCancellationProposal || bookingReschedulingProposal ? null"); expect(route).toContain("routeN8nAgentBookingReschedulingProposal"); });
});
