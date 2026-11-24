import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentArrivalIntentionProposalReadModel } from "./N8nAgentArrivalIntentionProposalReadModel.service";

const periods = [
  { periodId: "9cfc4527-2147-40e2-b621-3cd53a030904", serviceName: "Exame", unitName: "SEG SERRA", startTime: "08:00", endTime: "12:00", capacity: null, registered: 0 },
  { periodId: "7ce73882-c539-44d3-a1ea-205f1dd9fcc4", serviceName: "Exame", unitName: "SEG SERRA", startTime: "13:30", endTime: "17:30", capacity: 20, registered: 4 },
];

describe("n8n agent arrival intention proposal read model", () => {
  it("loads a bounded trusted tenant and date list", async () => {
    const trustedList = vi.fn().mockResolvedValue(periods);
    await resolveN8nAgentArrivalIntentionProposalReadModel({ companyId: "company-a", attendanceDate: "2026-11-30", message: "o segundo", correlationId: "wamid.arrival" }, trustedList);
    expect(trustedList).toHaveBeenCalledWith({ companyId: "company-a", attendanceDate: "2026-11-30", limit: 5 });
  });
  it("returns a proposal only for one trusted period", async () => {
    const result = await resolveN8nAgentArrivalIntentionProposalReadModel({ companyId: "company-a", attendanceDate: "2026-11-30", message: "quero o segundo", correlationId: "wamid.arrival" }, vi.fn().mockResolvedValue(periods));
    expect(result).toMatchObject({ ok: true, status: "proposal_ready", proposal: { draft: { periodId: "7ce73882-c539-44d3-a1ea-205f1dd9fcc4" }, arrivalIntentionExecutionAllowed: false }, candidateCount: 2 });
  });
  it.each(["quero um período", "primeiro ou segundo"])("fails closed without a unique target: %s", async message => {
    await expect(resolveN8nAgentArrivalIntentionProposalReadModel({ companyId: "company-a", attendanceDate: "2026-11-30", message, correlationId: "wamid.arrival" }, vi.fn().mockResolvedValue(periods))).resolves.toEqual({ ok: true, status: "not_resolved", proposal: null, candidateCount: 2 });
  });
});
