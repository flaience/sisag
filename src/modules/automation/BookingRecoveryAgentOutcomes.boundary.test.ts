import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("agent outcomes boundary", () => {
  const service = fs.readFileSync("src/modules/automation/BookingRecoveryAgentOutcomes.service.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/route.ts", "utf8");
  it("scopes and bounds reads", () => {
    expect(service).toContain("input.companyId");
    expect(service).toContain("Math.min(Math.max");
    expect(service).toContain(".limit(5000)");
    expect(route).toContain("authResult.auth.companyId");
  });
  it("measures shadow execution without changing authority", () => {
    for (const field of ["agentDecision", "agentExecution", "fallbackRate", "agentHumanAgreementRate", "totalTokens", "p95DurationMs"]) expect(service).toContain(field);
    expect(service).toContain("suggestedAction");
    expect(service).toContain("decidedAction");
  });
  it("is read only and has no operational capability", () => {
    for (const term of [".insert(", ".update(", "outbox", "WhatsApp", "BookingRecoveryManagementService"]) expect(service).not.toContain(term);
  });
});
