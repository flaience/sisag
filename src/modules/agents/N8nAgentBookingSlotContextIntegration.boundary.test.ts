import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const context = readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");
const observation = readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorObservation.service.ts", "utf8");

describe("n8n agent booking slot context integration boundary", () => {
  it("is disabled by default and limited to recent successful read-only availability", () => {
    expect(context).toContain("N8N_AGENT_BOOKING_SLOT_CONTEXT_ENABLED");
    expect(context).toContain('toolExecutionStatus, "succeeded"');
    expect(context).toContain("WINDOW_MS = 15 * 60 * 1000");
  });
  it("requeries from the trusted source instead of persisting slot payloads", () => {
    expect(context).toContain("Escolha de horário do cliente:");
    expect(context).toContain("isExplicitN8nAgentBookingSlotSelection");
    expect(observation).not.toContain("availableSlots");
    expect(observation).not.toContain("selectedSlot");
  });
  it("does not execute or dispatch bookings", () => {
    expect(context).not.toContain("executeBookingCommand");
    expect(context).not.toContain("OutboxPublisher");
  });
});
