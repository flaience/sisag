import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationProposalRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
const webhook = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking cancellation proposal routing boundary", () => {
  it("is opt-in and routes only a trusted future proposal", () => { expect(routing).toContain("N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED"); expect(routing).toContain("proposal.dispatchAllowed !== true"); expect(routing).toContain("proposal.cancellationExecutionAllowed !== false"); });
  it("persists state and outbox atomically with idempotency", () => { expect(routing).toContain("persistN8nAgentBookingCancellationProposalAndPublish"); expect(state).toContain("wa_send:cancellation-proposal:"); expect(state).toContain("getDb().transaction"); });
  it("is connected without cancellation execution", () => { expect(webhook).toContain("routeN8nAgentBookingCancellationProposal"); expect(routing).not.toContain("cancelAppointment"); expect(state).not.toContain("cancelAppointment"); });
});
