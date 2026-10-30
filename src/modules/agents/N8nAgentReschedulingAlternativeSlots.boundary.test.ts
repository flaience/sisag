import fs from "node:fs";
import { describe, expect, it } from "vitest";

const readModel = fs.readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingReadModel.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");

describe("n8n agent rescheduling alternative slots", () => {
  it("retries from the same local day only when no later slot exists", () => {
    for (const value of ["localDateIso", "zonedDateTimeToUtcISOString", "slots.length === 0", "alternativeFrom < dateFrom", "alternatives"]) expect(readModel).toContain(value);
  });
  it("uses only trusted timezone and bounded read-only availability", () => {
    expect(route).toContain("trustedContext.timeZone");
    expect(readModel).toContain("findAvailableSlots");
    expect(readModel).toContain("Math.min(Math.max(input.limit ?? 20, 1), 20)");
  });
  it("does not execute a mutation", () => {
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(readModel + route).not.toContain(forbidden);
  });
});
