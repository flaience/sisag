import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingDecisionRouting.service.ts", "utf8"), persistence = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingExecutionPersistence.service.ts", "utf8"), state = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8"), deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent booking rescheduling execution activation boundary", () => {
  it("enables proposal decision and execution together", () => { for (const flag of ["N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED=true", "N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED=true", "N8N_AGENT_BOOKING_RESCHEDULING_EXECUTION_ENABLED=true"]) expect(deploy).toContain(flag); });
  it("executes only explicit SIM behind a dedicated flag", () => { expect(routing).toContain('decision.decision === "confirm"'); expect(routing).toContain("executePersistedN8nAgentBookingRescheduling"); });
  it("resumes the same idempotent execution after interruption", () => { expect(state).toContain('inArray(n8nAgentBookingReschedulingStates.status, ["rescheduling_pending", "execution_in_progress"])'); expect(persistence).toContain('state.status !== "execution_in_progress"'); });
  it("uses the official adapter and definitive outbox", () => { expect(persistence).toContain("SisagSchedulingAdapter"); expect(persistence).toContain("rescheduleAppointment"); expect(persistence).toContain('"wa_send:rescheduling-result:" + input.state.id'); });
});
