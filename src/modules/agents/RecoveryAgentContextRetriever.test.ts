import { describe, expect, it } from "vitest";
import { RECOVERY_AGENT_CONTEXT_MAX_CHARS, SisagRecoveryAgentContextRetriever } from "./RecoveryAgentContextRetriever";

const input = { companyId: "company-a", recordCompanyId: "company-a", score: 1, priority: "urgent", classification: "negative", slaEscalated: true, assigned: false, caseAgeMinutes: 120, responseAgeMinutes: 60, bookingStatus: "COMPLETED", bookingStartTime: new Date("2026-09-01T12:00:00Z"), bookingSource: "panel", knowledge: [] };

describe("recovery agent context retriever", () => {
  it("builds a versioned snapshot from trusted operational facts", async () => {
    const result = await new SisagRecoveryAgentContextRetriever().retrieve(input, new Date("2026-09-03T12:00:00Z"));
    expect(result).toMatchObject({ ok: true, snapshot: { version: "recovery_context_v1", sources: ["recovery_case", "latest_response", "booking"], recovery: { score: 1 }, booking: { status: "COMPLETED", source: "panel" } } });
    expect(JSON.stringify(result).length).toBeLessThan(RECOVERY_AGENT_CONTEXT_MAX_CHARS);
  });
  it("rejects cross-tenant records", async () => {
    await expect(new SisagRecoveryAgentContextRetriever().retrieve({ ...input, recordCompanyId: "company-b" })).resolves.toEqual({ ok: false, errorCode: "context_tenant_mismatch" });
  });
  it("does not include direct identifiers or free-form notes", async () => {
    const result = await new SisagRecoveryAgentContextRetriever().retrieve(input);
    const serialized = JSON.stringify(result);
    for (const field of ["clientName", "phone", "email", "notes", "companyId", "recordCompanyId"]) expect(serialized).not.toContain(field);
  });
});
