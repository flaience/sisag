import fs from "node:fs";
import { describe, expect, it } from "vitest";

const context = fs.readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");

describe("n8n agent selected action extended follow-up", () => {
  it("extends only a successful selected action", () => {
    for (const value of ["SELECTED_ACTION_WINDOW_MS = 60 * 60 * 1000", "findPriorSelectedActionDb", "scheduling.resolve_selected_appointment_action", `toolExecutionStatus, "succeeded"`]) expect(context).toContain(value);
  });
  it("preserves the regular fifteen-minute context window", () => {
    expect(context).toContain("WINDOW_MS = 15 * 60 * 1000");
    expect(context).toContain("if (!prior && slotSelection)");
  });
  it("remains tenant account sender and time scoped without mutations", () => {
    for (const value of ["companyId", "whatsappAccountId", "senderPhoneE164", "gte(messageLogs.createdAt, cutoff)"]) expect(context).toContain(value);
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(context).not.toContain(forbidden);
  });
});
