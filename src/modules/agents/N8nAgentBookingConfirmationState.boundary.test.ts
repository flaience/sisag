import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const schema = readFileSync("src/drizzle/schema.ts", "utf8");
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationState.service.ts", "utf8");
const migration = readFileSync("infra/n8n-agent-booking-confirmation-state.sql", "utf8");
describe("n8n agent booking confirmation state boundary", () => {
  it("stores minimal expiring state without message or phone", () => { expect(schema).toContain("n8nAgentBookingConfirmationStates"); expect(service).toContain("TTL_MS = 10 * 60 * 1000"); expect(service).toContain("senderKey"); expect(schema.slice(schema.indexOf("n8nAgentBookingConfirmationStates"), schema.indexOf("n8nAgentShadowMirrorObservations"))).not.toContain("message:"); expect(schema.slice(schema.indexOf("n8nAgentBookingConfirmationStates"), schema.indexOf("n8nAgentShadowMirrorObservations"))).not.toContain("phone"); });
  it("persists state and outbox atomically", () => { expect(service).toContain("getDb().transaction(async tx"); expect(service).toContain("tx.insert(n8nAgentBookingConfirmationStates)"); expect(service).toContain("tx.insert(outbox)"); });
  it("records SIM or NAO without booking execution", () => { expect(service).toContain("readDraftDecision"); expect(service).toContain("confirmed_pending_execution"); expect(service).toContain("rejected"); expect(service).not.toContain("executeBookingCommand"); expect(service).not.toContain("createAppointment"); });
  it("enables RLS and constrained states", () => { expect(migration).toContain("ENABLE ROW LEVEL SECURITY"); expect(migration).toContain("n8n_agent_booking_confirmation_status_check"); });
});
