import fs from "node:fs";
import { describe, expect, it } from "vitest";
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
describe("n8n agent appointment status routing boundary", () => {
  it("requires the exact read-only decision and coherent observation", () => { for (const value of ["scheduling.explain_appointment_status", "appointment_status_required", "SCHEDULING_APPOINTMENT_NOT_FOUND", "APPOINTMENT_STATUSES", "candidate.startsAt"]) expect(service).toContain(value); });
  it("uses the existing idempotent outbox path", () => { expect(service).toContain('dedupeKey: "wa_send:" + input.correlationId'); expect(service).toContain("n8n_agent_appointment_status_v1"); });
  it("does not mutate appointments", () => { for (const value of ["create_appointment", "cancel_appointment", "reschedule_appointment", "executeBookingCommand", "BookingService.create"]) expect(service).not.toContain(value); });
});
