import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingProposalRouting.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationState.service.ts", "utf8");
const workflow = JSON.parse(readFileSync("automation/n8n/workflows/sisag-agent-shadow-v7.json", "utf8"));
const serialized = JSON.stringify(workflow);

describe("n8n agent booking proposal routing boundary", () => {
  it("authorizes only proposal question dispatch in v7", () => { expect(serialized).toContain("dispatchAllowed: true"); expect(serialized).toContain("bookingExecutionAllowed: false"); expect(workflow.active).toBe(false); });
  it("routes through the outbox with idempotency", () => { expect(route).toContain("routeN8nAgentBookingProposal"); expect(service).toContain("persistN8nAgentBookingProposalAndPublish"); expect(state).toContain("wa_send:${input.correlationId}"); expect(state).toContain("n8n_agent_booking_proposal_v1"); });
  it("does not execute a booking", () => { expect(service + route + serialized).not.toContain("executeBookingCommand"); expect(service + route + serialized).not.toContain("createAppointment"); expect(service).toContain("bookingExecutionAllowed === false"); });
});
