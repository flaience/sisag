import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("release rollback UI", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/page.tsx", "utf8");
  it("shows the versioned rollback decision per plan", () => { for (const value of ["Proteção e revisão de rollback", "releaseCanaries.rollback.policyVersion", "releaseCanaries.rollback.plans", "plan.reasons"]) expect(page).toContain(value); });
  it("translates every decision clearly", () => { for (const value of ["Revisão de rollback necessária", "Revisão de rollback recomendada", "Decisão suspensa", "Monitorar rollout"]) expect(page).toContain(value); });
  it("has a safe empty state and no operational controls", () => { expect(page).toContain("Nenhuma decisão de rollback disponível no período"); expect(page).toContain("Revisão humana obrigatória"); expect(page).toContain("não reduz rollout, interrompe plano ou executa rollback automaticamente"); for (const value of ["rollbackRelease", "stopRelease", "updateRollout"]) expect(page).not.toContain(value); });
});
