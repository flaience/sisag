import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery draft UI integration", () => {
  it("shows generation and delegates explicit human review", () => {
    const page = fs.readFileSync("src/app/admin/settings/booking-followups/recovery/page.tsx", "utf8");
    const review = fs.readFileSync("src/components/automation/RecoveryDraftReview.tsx", "utf8");
    expect(page).toContain("Preparar abordagem");
    expect(page).toContain("RecoveryDraftReview");
    expect(page).toContain('/draft"');
    expect(review).toContain("<textarea");
    expect(review).toContain("Aprovar e encaminhar");
    expect(review).toContain("Revise antes de aprovar");
  });
});
