import fs from "node:fs";
import { describe, expect, it } from "vitest";

const decision = fs.readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingDecision.ts", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");

describe("n8n agent rescheduling requested time window", () => {
  it("starts an explicit rescheduling search at the requested local time", () => {
    expect(decision).toContain("zonedDateTimeToUtcISOString(explicit.dateIso, explicit.time, timeZone)");
    expect(decision).not.toContain(`zonedDateTimeToUtcISOString(explicit.dateIso, "00:00", timeZone)`);
  });
  it("routes safe read-only rescheduling alternatives", () => {
    for (const value of ["scheduling.prepare_rescheduling", "rescheduling_required", "readOnlyDecision", "safeOutcome"]) expect(routing).toContain(value);
  });
  it("does not execute a mutation", () => {
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(decision + routing).not.toContain(forbidden);
  });
});
