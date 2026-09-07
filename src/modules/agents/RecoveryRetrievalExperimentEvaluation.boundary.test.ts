import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("retrieval experiment evaluation boundary", () => {
  const service = fs.readFileSync("src/modules/agents/RecoveryRetrievalExperimentEvaluation.service.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/experiments/evaluations/route.ts", "utf8");
  const migration = fs.readFileSync("infra/recovery-agent-retrieval-experiment-evaluations.sql", "utf8");

  it("isolates experiment and evaluation by tenant", () => {
    expect(service.match(/companyId/g)?.length).toBeGreaterThanOrEqual(6);
    expect(service).toContain("recoveryAgentRetrievalShadowExperiments.companyId");
    expect(service).toContain("recoveryAgentRetrievalExperimentEvaluations.companyId");
  });

  it("evaluates only stopped experiments with recorded observations", () => {
    expect(service).toContain('status, "stopped"');
    expect(service).toContain("experiment_evidence_not_found");
    expect(service).toContain("experiment_already_evaluated");
    expect(migration).toContain("UNIQUE INDEX");
  });

  it("derives evidence and identity on the server", () => {
    expect(service).toContain("BookingRecoveryAgentOutcomesService.get");
    expect(service).toContain("capturedAt");
    expect(route).toContain("auth.auth.companyId");
    expect(route).toContain("auth.auth.userId");
  });

  it("has no activation or external execution", () => {
    for (const forbidden of ["outbox", "whatsapp", "provider", ".update(", "automaticPromotion"]) expect(service.toLowerCase()).not.toContain(forbidden.toLowerCase());
  });
});
