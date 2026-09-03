import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery context boundary", () => {
  const retriever = fs.readFileSync("src/modules/agents/RecoveryAgentContextRetriever.ts", "utf8");
  const service = fs.readFileSync("src/modules/automation/BookingRecoveryRecommendation.service.ts", "utf8");
  it("requires tenant equality and a bounded snapshot", () => { expect(retriever).toContain("input.companyId !== input.recordCompanyId"); expect(retriever).toContain("RECOVERY_AGENT_CONTEXT_MAX_CHARS"); });
  it("reads booking ownership inside the authenticated tenant", () => { expect(service).toContain("eq(bookings.companyId, input.companyId)"); expect(service).toContain("recordCompanyId: bookings.companyId"); });
  it("cannot access operational integrations or mutate state", () => { for (const term of ["getDb", "outbox", "WhatsApp", "fetch(", "BookingRecoveryManagementService"]) expect(retriever).not.toContain(term); });
});
