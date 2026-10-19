import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationExecutionPersistence.service.ts", "utf8");
const migration = readFileSync("infra/n8n-agent-booking-cancellation-execution-persistence.sql", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking cancellation execution persistence boundary", () => {
  it("loads by tenant account and hashed sender identity", () => { expect(service).toContain("n8nAgentBookingCancellationStates.companyId"); expect(service).toContain("n8nAgentBookingCancellationStates.whatsappAccountId"); expect(service).toContain("n8nAgentBookingCancellationStates.senderKey"); expect(service).toContain('createHash("sha256")'); });
  it("claims only a pending cancellation and records terminal outcomes", () => { expect(service).toContain('eq(n8nAgentBookingCancellationStates.status, "cancellation_pending")'); expect(service).toContain('status: "execution_in_progress"'); expect(service).toContain('"failed_not_cancellable"'); expect(service).toContain('"execution_uncertain"'); });
  it("uses the official scheduling adapter", () => { expect(service).toContain("SisagSchedulingAdapter"); expect(service).toContain("cancelAppointment"); expect(service).not.toContain("BookingCoreService"); });
  it("commits state and outbox response atomically without activation", () => { expect(service).toContain("db().transaction(async tx"); expect(service).toContain("tx.update(n8nAgentBookingCancellationStates)"); expect(service).toContain("tx.insert(outbox)"); expect(service).toContain('"wa_send:cancellation-result:" + input.state.id'); expect(migration).toContain("n8n_agent_booking_cancellation_execution_idx"); expect(route).not.toContain("executePersistedN8nAgentBookingCancellation"); });
});
