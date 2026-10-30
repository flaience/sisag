import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v14.json", "utf8");
const state = fs.readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingState.service.ts", "utf8");

describe("n8n agent rescheduling current-turn slot and rejection", () => {
  it("selects the new slot only from the current contextual turn", () => {
    for (const value of ["selectionMarkers", "selectionMessage", "message.lastIndexOf(marker)", "selectionMessage.matchAll", "test(selectionMessage)"]) expect(workflow).toContain(value);
  });
  it("keeps the full message for the rescheduling intent", () => {
    expect(workflow).toContain("const reschedulingTokens = message.split");
    expect(workflow).toContain("toolName === 'scheduling.prepare_rescheduling'");
  });
  it("records and acknowledges a rejection without executing", () => {
    for (const value of [`decision === "reject"`, "tx.insert(outbox)", "wa_send:rescheduling-rejected:", "mantive o horário atual", "onConflictDoNothing"]) expect(state).toContain(value);
    expect(state).not.toContain("rescheduleAppointment");
  });
});
