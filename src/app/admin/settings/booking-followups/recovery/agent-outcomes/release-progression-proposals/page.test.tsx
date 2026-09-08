import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("release progression proposals UI", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/release-progression-proposals/page.tsx", "utf8");
  const hub = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/page.tsx", "utf8");

  it("offers only scheduled eligible plans without a pending proposal", () => {
    for (const value of ['x.status === "eligible_for_expansion"', 'x.status === "scheduled"', 'x.status === "proposed"', "!pending.has(x.id)"]) expect(page).toContain(value);
  });
  it("enforces a gradual bounded increase", () => {
    for (const value of ["rolloutPercent + 25", "proposed <= selected.rolloutPercent", "proposed > maximum", "maxLength={500}"]) expect(page).toContain(value);
  });
  it("shows frozen evidence and governance history", () => {
    for (const value of ["Histórico, revisão e aplicação", "healthPolicyVersion", "progressionPolicyVersion", "item.evidence?.decision", "reviewReason", "reviewedAt", "applicationReason", "appliedAt"]) expect(page).toContain(value);
  });
  it("reviews only pending proposals with a required reason", () => {
    for (const value of ['method: "PATCH"', 'item.status === "proposed"', "note.trim().length < 3", "Aprovar proposta", "Rejeitar proposta"]) expect(page).toContain(value);
  });
  it("applies only approved proposals after explicit confirmation and justification", () => {
    for (const value of ['item.status === "approved"', 'method: "PUT"', "window.confirm", "window.prompt", "Aplicar progressão aprovada"]) expect(page).toContain(value);
  });
  it("surfaces safe revalidation and concurrency failures", () => {
    for (const value of ["release_progression_health_changed", "release_progression_policy_changed", "release_plan_changed", "concurrent_release_progression"]) expect(page).toContain(value);
  });
  it("does not claim automatic progression", () => {
    expect(page).toContain("nenhuma progressão é automática");
    for (const value of ["applyRollout", "activateRelease"]) expect(page).not.toContain(value);
  });
  it("is linked from the observability hub", () => expect(hub).toContain("/agent-outcomes/release-progression-proposals"));
});
