import fs from "node:fs";
import { describe, expect, it } from "vitest";

const context = fs.readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");

describe("n8n agent selected action rescheduling follow-up", () => {
  it("accepts the successful read-only selected action as recent context", () => {
    expect(context).toContain("scheduling.resolve_selected_appointment_action");
    expect(context).toContain(`toolExecutionStatus, "succeeded"`);
  });
  it("keeps the continuation inside the bounded tenant and account query", () => {
    for (const value of ["companyId", "whatsappAccountId", "WINDOW_MS", "senderPhoneE164"]) expect(context).toContain(value);
  });
  it("does not add mutations", () => {
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(context).not.toContain(forbidden);
  });
});
