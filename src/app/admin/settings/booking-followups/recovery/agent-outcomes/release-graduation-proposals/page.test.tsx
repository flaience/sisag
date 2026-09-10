import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("release graduation proposals UI", () => {
  const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/release-graduation-proposals/page.tsx", "utf8");
  const hub = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/agent-outcomes/page.tsx", "utf8");
  it("offers only eligible scheduled full releases without pending proposal", () => { for (const value of ['item.status === "eligible_for_graduation"', 'item.status === "scheduled"', "item.rolloutPercent === 100", 'item.status === "proposed"', "!pending.has(item.id)"]) expect(page).toContain(value); });
  it("sends only plan and reason", () => { expect(page).toContain("JSON.stringify({ planId, reason: reason.trim() })"); for (const value of ["companyId", "createdBy", "releaseCandidateId, reason"]) expect(page).not.toContain("JSON.stringify({ " + value); });
  it("shows frozen evidence and policy versions", () => { for (const value of ["evidence?.decision", "evidence?.observedDays", "evidence?.observedFrom", "evidence?.observedTo", "healthPolicyVersion", "graduationPolicyVersion", "releaseCandidateId"]) expect(page).toContain(value); });
  it("states the human-only boundary", () => { expect(page).toContain("Aprovação humana continua obrigatória"); expect(page).toContain("Não revisa, aplica ou promove releases automaticamente"); for (const value of ['method: "PATCH"', 'method: "PUT"', "automaticGraduation: true"]) expect(page).not.toContain(value); });
  it("is linked from the observability hub", () => expect(hub).toContain("/agent-outcomes/release-graduation-proposals"));
});
