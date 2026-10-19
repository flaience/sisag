import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposalRouting.service.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking cancellation proposal routing observability boundary", () => {
  it("records only correlation stage and bounded code", () => { expect(service).toContain('event: "n8n_agent_booking_cancellation_proposal_routing"'); expect(service).toContain("correlationId: input.correlationId"); expect(service).toContain('stage: "persistence"'); expect(service).toContain("safeErrorCode"); expect(service).not.toContain("error.message"); });
  it("does not log or observe message phone service or appointment payload", () => { const observation = service.slice(service.indexOf("type Observation"), service.indexOf("type Dependencies")); expect(observation).not.toContain("toPhone"); expect(observation).not.toContain("appointmentId"); expect(observation).not.toContain("serviceName"); expect(observation).not.toContain("messageText"); });
  it("prevents appointment status from replacing an explicit cancellation proposal", () => { expect(route).toContain("bookingConfirmationProposal || bookingCancellationProposal ? null"); expect(service).toContain("n8n_agent_booking_cancellation_routing_error_v1"); });
});
