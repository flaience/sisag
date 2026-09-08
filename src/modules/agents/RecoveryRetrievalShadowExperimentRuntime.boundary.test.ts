import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("retrieval shadow experiment runtime boundary", () => {
  const service = fs.readFileSync("src/modules/agents/RecoveryRetrievalShadowExperimentRuntime.service.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/route.ts", "utf8");
  const recommendation = fs.readFileSync("src/modules/automation/BookingRecoveryRecommendation.service.ts", "utf8");

  it("resolves only active approved tenant experiments in their window", () => {
    for (const value of ["input.companyId", 'status,"approved"', 'status,"active"', "startsAt,now", "endsAt,now"]) expect(service).toContain(value);
  });
  it("samples deterministically by tenant case and experiment", () => {
    expect(service).toContain("sha256");
    expect(service).toContain("input.companyId}:${input.caseId}:${row.experimentId");
  });
  it("passes resolution from authenticated route", () => {
    expect(route).toContain("ShadowExperimentRuntimeService.resolve");
    expect(route).toContain("companyId:authResult.auth.companyId");
    expect(recommendation).toContain("releasePolicy??input.semantic?.experiment");
  });
  it("keeps lexical fallback and has no operational capability", () => {
    expect(recommendation).toContain("knowledge=retrieveRecoveryKnowledge");
    expect(recommendation).not.toContain("knowledge=vectorShadow");
    for (const value of ["outbox", "WhatsApp", "MCP"]) expect(service).not.toContain(value);
  });
});
