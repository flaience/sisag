import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/drizzle/schema.ts", "utf8"), sql = readFileSync("infra/n8n-agent-booking-rescheduling-state.sql", "utf8"), service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8"), routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingProposalRouting.service.ts", "utf8");
describe("n8n agent booking rescheduling state boundary", () => {
  it("is tenant scoped idempotent and protected by RLS", () => { expect(schema).toContain("n8nAgentBookingReschedulingStates"); expect(sql).toContain("ENABLE ROW LEVEL SECURITY"); expect(sql).toContain("n8n_agent_booking_rescheduling_request_uq"); expect(service).toContain("companyId"); expect(service).toContain("whatsappAccountId"); expect(service).toContain("senderKey"); });
  it("persists proposal and outbox atomically", () => { expect(service).toContain("getDb().transaction"); expect(service).toContain("wa_send:rescheduling-proposal:"); expect(routing).toContain("persistN8nAgentBookingReschedulingProposalAndPublish"); });
  it("records SIM or NÃO without rescheduling", () => { expect(service).toContain("readDraftDecision"); expect(service).toContain("rescheduling_pending"); expect(service).toContain("rejected"); expect(service).not.toContain("rescheduleAppointment"); });
});
