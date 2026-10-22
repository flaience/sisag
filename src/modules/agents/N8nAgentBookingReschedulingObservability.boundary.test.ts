import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const service = readFileSync("src/modules/agents/n8n/N8nAgentBookingReschedulingProposalRouting.service.ts", "utf8");
describe("n8n agent booking rescheduling observability boundary", () => {
  it("observes only correlation stage and bounded code", () => { expect(service).toContain('event: "n8n_agent_booking_rescheduling_routing"'); expect(service).toContain("correlationId: input.correlationId"); expect(service).toContain("safeErrorCode"); expect(service).not.toContain("error.message"); });
  it("does not include private payload in the observation contract", () => { const value = service.slice(service.indexOf("type Observation"), service.indexOf("type Dependencies")); expect(value).not.toContain("toPhone"); expect(value).not.toContain("appointmentId"); expect(value).not.toContain("serviceId"); expect(value).not.toContain("text"); });
  it("uses an idempotent neutral fallback without executing rescheduling", () => { expect(service).toContain("wa_send:rescheduling-routing-error:"); expect(service).toContain("Seu agendamento não foi alterado"); expect(service).not.toContain("rescheduleAppointment"); });
});
