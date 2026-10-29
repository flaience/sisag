import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const context = readFileSync("src/modules/agents/n8n/N8nAgentConversationContext.service.ts", "utf8");
const decision = readFileSync("src/modules/agents/n8n/N8nAgentAppointmentSelectionDecision.ts", "utf8");

describe("n8n agent booking date follow-up context boundary", () => {
  it("continues only trusted scheduling conversations", () => {
    for (const value of ["scheduling.list_upcoming_appointments", "missing_information", "isTrustedContinuationSource"]) expect(context).toContain(value);
  });
  it("requires appointment-list context for date selection while preserving ordinals", () => {
    expect(decision).toContain("contextualAppointmentList");
    expect(decision).toContain("return ordinal || contextualAppointmentList");
  });
  it("does not mutate scheduling", () => {
    for (const source of [context, decision]) for (const forbidden of ["createAppointment(", "cancelAppointment(", "rescheduleAppointment("]) expect(source).not.toContain(forbidden);
  });
});
