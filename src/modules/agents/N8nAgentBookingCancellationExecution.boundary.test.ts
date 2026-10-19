import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const execution = readFileSync("src/modules/agents/n8n/N8nAgentBookingCancellationExecution.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking cancellation execution boundary", () => {
  it("requires tenant and trusted appointment identity", () => { expect(execution).toContain("companyId: state.companyId"); expect(execution).toContain("appointmentId: state.appointmentId"); expect(execution).not.toContain("senderPhone"); });
  it("requires one claim and stable idempotency", () => { expect(execution).toContain("dependencies.claim(state.id)"); expect(execution).toContain('"n8n-cancellation:" + stateId'); expect(execution).toContain("dependencies.complete(state.id, result)"); });
  it("rejects past appointments and remains disconnected", () => { expect(execution).toContain("state.startsAt <= new Date()"); expect(route).not.toContain("executeConfirmedN8nAgentBookingCancellation"); });
  it("does not implement a direct database cancellation", () => { expect(execution).not.toContain("BookingCoreService"); expect(execution).not.toContain("BookingService.cancelById"); expect(execution).not.toContain('status: "CANCELLED"'); });
});
