import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery recommendation boundary", () => {
  const service = fs.readFileSync("src/modules/automation/BookingRecoveryRecommendation.service.ts", "utf8");
  const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/[id]/recommendation/route.ts", "utf8");
  it("keeps deterministic fields authoritative and persists a separate shadow decision", () => {
    expect(service).toContain("const recommendation = recommendRecoveryAction(signals)");
    expect(service).toContain("...recommendation");
    expect(service).toContain("agentDecision: shadow.decision");
    expect(service).toContain("agentExecution");
    expect(service).toContain("...shadow.execution");
    expect(service).toContain("retrievalShadow: vectorShadow");
    expect(schema).toContain('agentDecision: jsonb("agent_decision")');
    expect(service).toContain("version: sql");
  });
  it("derives tenant from authenticated context", () => {
    expect(route).toContain("authResult.auth.companyId");
    expect(route).not.toContain("body.companyId");
    expect(service.match(/input.companyId/g)?.length).toBeGreaterThanOrEqual(4);
  });
  it("has no execution or sending capability", () => {
    expect(service).not.toContain("outbox");
    expect(service).not.toContain("BookingRecoveryManagementService");
    expect(service).not.toContain("WhatsApp");
  });
});
