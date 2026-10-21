import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const execution = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingExecution.ts", "utf8"), route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking rescheduling execution boundary", () => {
  it("requires tenant appointment and persisted interval", () => { for (const token of ["companyId: state.companyId", "appointmentId: state.appointmentId", "startsAt: state.newStartsAt.toISOString()", "endsAt: state.newEndsAt.toISOString()"] ) expect(execution).toContain(token); expect(execution).not.toContain("senderPhone"); });
  it("requires one claim and stable idempotency", () => { expect(execution).toContain("dependencies.claim(state.id)"); expect(execution).toContain('"n8n-rescheduling:" + stateId'); expect(execution).toContain("dependencies.complete(state.id, result)"); });
  it("rejects expired equal or invalid intervals and remains disconnected", () => { expect(execution).toContain("state.newStartsAt <= now"); expect(execution).toContain("state.newEndsAt <= state.newStartsAt"); expect(execution).toContain("state.currentStartsAt.getTime() === state.newStartsAt.getTime()"); expect(route).not.toContain("executeConfirmedN8nAgentBookingRescheduling"); });
  it("does not implement direct database rescheduling", () => { expect(execution).not.toContain("BookingCoreService"); expect(execution).not.toContain("rescheduleById"); });
});
