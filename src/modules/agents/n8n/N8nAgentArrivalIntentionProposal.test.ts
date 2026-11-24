import { describe, expect, it } from "vitest";
import { createN8nAgentArrivalIntentionProposal } from "./N8nAgentArrivalIntentionProposal";

const periods = [
  { periodId: "9cfc4527-2147-40e2-b621-3cd53a030904", serviceName: "Exame", unitName: "SEG SERRA", startTime: "08:00", endTime: "12:00", capacity: null, registered: 0 },
  { periodId: "7ce73882-c539-44d3-a1ea-205f1dd9fcc4", serviceName: "Exame", unitName: "SEG SERRA", startTime: "13:30", endTime: "17:30", capacity: 20, registered: 4 },
];

describe("n8n agent arrival intention proposal", () => {
  it.each([["quero o primeiro", "9cfc4527-2147-40e2-b621-3cd53a030904"], ["prefiro à tarde", "7ce73882-c539-44d3-a1ea-205f1dd9fcc4"]])("selects one trusted period: %s", (message, periodId) => {
    const result = createN8nAgentArrivalIntentionProposal({ message, attendanceDate: "2026-11-30", correlationId: "wamid.arrival", periods });
    expect(result).toMatchObject({ kind: "arrival_intention", status: "awaiting_explicit_confirmation", draft: { periodId, attendanceDate: "2026-11-30" }, dispatchAllowed: false, arrivalIntentionExecutionAllowed: false });
    expect(result?.text).toContain("não reserva horário nem posição na fila");
  });
  it.each(["quero um período", "primeiro ou segundo", "à noite"])("fails closed for ambiguous or unmatched selection: %s", message => {
    expect(createN8nAgentArrivalIntentionProposal({ message, attendanceDate: "2026-11-30", correlationId: "wamid.arrival", periods })).toBeNull();
  });
  it("rejects exhausted or untrusted periods", () => {
    expect(createN8nAgentArrivalIntentionProposal({ message: "o primeiro", attendanceDate: "2026-11-30", correlationId: "wamid.arrival", periods: [{ ...periods[0], capacity: 1, registered: 1 }] })).toBeNull();
    expect(createN8nAgentArrivalIntentionProposal({ message: "o primeiro", attendanceDate: "2026-11-30", correlationId: "wamid.arrival", periods: [{ ...periods[0], periodId: "texto-do-cliente" }] })).toBeNull();
  });
});
