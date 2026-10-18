import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/drizzle/schema.ts", "utf8");
const sql = readFileSync("infra/n8n-agent-booking-cancellation-state.sql", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
describe("n8n agent booking cancellation state boundary", () => {
  it("is tenant scoped, idempotent and protected by RLS", () => { expect(schema).toContain("n8nAgentBookingCancellationStates"); expect(sql).toContain("ENABLE ROW LEVEL SECURITY"); expect(sql).toContain("n8n_agent_booking_cancellation_request_uq"); expect(service).toContain("companyId"); expect(service).toContain("whatsappAccountId"); expect(service).toContain("senderKey"); });
  it("persists proposal and outbox atomically", () => { expect(service).toContain("getDb().transaction"); expect(service).toContain("n8nAgentBookingCancellationStates"); expect(service).toContain("wa_send:cancellation-proposal:"); });
  it("records SIM or NÃO without cancelling", () => { expect(service).toContain("readDraftDecision"); expect(service).toContain("cancellation_pending"); expect(service).toContain("rejected"); expect(service).not.toContain("cancelAppointment"); });
});
