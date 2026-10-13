import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationExecutionPersistence.service.ts", "utf8");
const migration = readFileSync("infra/n8n-agent-booking-confirmation-execution-persistence.sql", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking confirmation execution persistence boundary", () => {
  it("claims only a confirmed state and records terminal outcomes", () => { expect(service).toContain('eq(n8nAgentBookingConfirmationStates.status, "confirmed_pending_execution")'); expect(service).toContain('status: "execution_in_progress"'); expect(service).toContain('"failed_slot_taken"'); expect(service).toContain('"execution_uncertain"'); });
  it("commits state and definitive outbox response atomically", () => { expect(service).toContain("db().transaction(async tx"); expect(service).toContain("tx.update(n8nAgentBookingConfirmationStates)"); expect(service).toContain("tx.insert(outbox)"); expect(service).toContain('"wa_send:booking-result:" + input.state.id'); });
  it("extends the database contract without activating production", () => { expect(migration).toContain("execution_in_progress"); expect(migration).toContain("n8n_agent_booking_confirmation_execution_idx"); expect(route).not.toContain("executePersistedN8nAgentBookingConfirmation"); });
});
