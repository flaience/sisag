import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const execution = readFileSync("src/modules/agents/n8n/N8nAgentBookingConfirmationExecution.ts", "utf8");
const route = readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
describe("n8n agent booking confirmation execution boundary", () => {
  it("uses only the unified booking command", () => { expect(execution).toContain("executeBookingCommand"); expect(execution).not.toContain("BookingService.createAuto"); expect(execution).not.toContain("AppointmentRepository"); });
  it("requires a single claim and stable idempotency", () => { expect(execution).toContain("dependencies.claim(state.id)"); expect(execution).toContain('"n8n-confirmation:" + stateId'); expect(execution).toContain("dependencies.complete(state.id, result)"); });
  it("is not activated in the webhook before persistence recovery exists", () => { expect(route).not.toContain("executeConfirmedN8nAgentBooking"); });
});
