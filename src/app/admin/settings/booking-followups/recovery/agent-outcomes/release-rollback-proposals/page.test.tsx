import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("release rollback proposals UI", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/page.tsx", "utf8");

  it("offers only eligible scheduled plans without pending proposal", () => {
    for (const value of ['x.status==="rollback_review_required"', 'x.status==="rollback_review_recommended"', 'x.status==="scheduled"', 'x.status==="proposed"', '!pending.has(x.id)']) expect(page).toContain(value);
  });
  it("enforces gradual reduction", () => {
    for (const value of ["rolloutPercent-25", "proposed>=selected.rolloutPercent", "proposed<minimum", "maxLength={500}"]) expect(page).toContain(value);
  });
  it("shows evidence, review and application history", () => {
    for (const value of ["Histórico, revisão e aplicação", "healthPolicyVersion", "rollbackPolicyVersion", "reviewReason", "reviewedAt", "applicationReason", "appliedAt"]) expect(page).toContain(value);
  });
  it("reviews only pending proposals with reason", () => {
    for (const value of ['method:"PATCH"', 'item.status==="proposed"', "note.trim().length<3", "Aprovar proposta", "Rejeitar proposta"]) expect(page).toContain(value);
  });
  it("applies only approved proposals after confirmation and justification", () => {
    for (const value of ['item.status==="approved"', 'method:"PUT"', "window.confirm", "window.prompt", "Aplicar rollback aprovado"]) expect(page).toContain(value);
  });
  it("surfaces safe revalidation and concurrency failures", () => {
    for (const value of ["release_rollback_health_changed", "release_rollback_policy_changed", "release_plan_changed", "concurrent_release_rollback"]) expect(page).toContain(value);
  });
  it("does not claim or invoke automatic rollback", () => {
    expect(page).toContain("nenhum rollback é automático");
    for (const value of ["applyRollbackAutomatically", "activateRelease"]) expect(page).not.toContain(value);
  });
});
