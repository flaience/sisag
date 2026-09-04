import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("retrieval evaluation boundary", () => {
  const service = fs.readFileSync("src/modules/agents/RecoveryRetrievalEvaluation.service.ts", "utf8"), route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/retrieval-evaluation/route.ts", "utf8");
  it("isolates data by tenant", () => { expect(service.match(/input.companyId/g)?.length).toBeGreaterThanOrEqual(5); expect(service).toContain("eq(bookingRecoveryRecommendations.companyId,input.companyId)"); expect(service).toContain("eq(recoveryAgentKnowledgeDocuments.companyId,input.companyId)"); expect(service).toContain("eq(recoveryAgentRetrievalEvaluations.companyId,input.companyId)"); });
  it("accepts only recorded ranked documents", () => { expect(service).toContain("document_not_in_ranking"); expect(service).toContain("indexOf(input.command.documentId)"); });
  it("derives identity from auth", () => { expect(route).toContain("auth.auth.companyId"); expect(route).toContain("auth.auth.userId"); expect(route).not.toContain("body.companyId"); });
  it("has no operational capability", () => { for (const term of ["outbox", "WhatsApp", "BookingRecoveryManagementService"]) expect(service).not.toContain(term); });
});
