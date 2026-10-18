import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposalRouting.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent booking cancellation proposal routing boundary", () => {
  it("is opt-in and routes only a trusted future proposal", () => { expect(routing).toContain("N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED"); expect(routing).toContain("proposal.dispatchAllowed === true"); expect(routing).toContain("proposal.cancellationExecutionAllowed === false"); expect(routing).toContain("scheduling.explain_appointment_status"); });
  it("publishes only the question with idempotency", () => { expect(routing).toContain("wa_send:cancellation-proposal:"); expect(routing).toContain("OutboxPublisher.publish"); expect(routing).not.toContain("cancelAppointment"); });
  it("is connected and enabled in production", () => { expect(webhook).toContain("routeN8nAgentBookingCancellationProposal"); expect(deploy).toContain("N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED=true"); });
});
