import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationDecisionRouting.service.ts", "utf8");
const persistence = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationExecutionPersistence.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationState.service.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent booking cancellation execution activation boundary", () => {
  it("executes only explicit SIM behind a dedicated flag", () => { expect(routing).toContain("N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED"); expect(routing).toContain('decision.decision === "confirm"'); expect(routing).toContain("executePersistedN8nAgentBookingCancellation"); expect(deploy).toContain("N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED=true"); });
  it("resumes the same idempotent execution after interruption", () => { expect(state).toContain('inArray(n8nAgentBookingCancellationStates.status, ["cancellation_pending", "execution_in_progress"])'); expect(persistence).toContain('state.status !== "execution_in_progress"'); });
  it("keeps the official cancellation adapter and definitive outbox", () => { expect(persistence).toContain("SisagSchedulingAdapter"); expect(persistence).toContain("cancelAppointment"); expect(persistence).toContain('"wa_send:cancellation-result:" + input.state.id'); });
});
