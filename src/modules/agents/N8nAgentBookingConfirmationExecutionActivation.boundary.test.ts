import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const routing = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationDecisionRouting.service.ts", "utf8");
const persistence = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationExecutionPersistence.service.ts", "utf8");
const state = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationState.service.ts", "utf8");
const deploy = readFileSync(".github/workflows/deploy.yml", "utf8");
describe("n8n agent booking confirmation execution activation boundary", () => {
  it("executes only an explicitly confirmed state behind a dedicated flag", () => { expect(routing).toContain("N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED"); expect(routing).toContain('decision.decision === "confirm"'); expect(routing).toContain("executePersistedN8nAgentBookingConfirmation"); expect(deploy).toContain("N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED=true"); });
  it("resumes the same idempotent execution after interruption", () => { expect(state).toContain('inArray(n8nAgentBookingConfirmationStates.status, ["confirmed_pending_execution", "execution_in_progress"])'); expect(persistence).toContain('state.status !== "execution_in_progress"'); });
  it("keeps the official booking command and definitive outbox", () => { expect(persistence).toContain("executeBookingCommand"); expect(persistence).toContain('"wa_send:booking-result:" + input.state.id'); });
});
