import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";

describe("commercial post-activation due work items schema", () => {
  const config = getTableConfig(commercialPostActivationDueWorkItems);

  it("deduplicates each onboarding milestone", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_pa_due_items_onboarding_milestone_uq",
    );
  });

  it("indexes claimable work and expired processing leases", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(
      expect.arrayContaining([
        "commercial_pa_due_items_claimable_idx",
        "commercial_pa_due_items_processing_expiry_idx",
      ]),
    );
  });

  it("isolates outstanding operations from completed history", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(
      expect.arrayContaining([
        "commercial_pa_due_items_outstanding_idx",
        "commercial_pa_due_items_completed_at_idx",
      ]),
    );
  });

  it("guards state, attempts, priority, locks, and completion", () => {
    expect(config.checks.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "commercial_post_activation_due_items_status_check",
        "commercial_post_activation_due_items_milestone_code_check",
        "commercial_post_activation_due_items_priority_check",
        "commercial_post_activation_due_items_attempts_check",
        "commercial_post_activation_due_items_lock_check",
        "commercial_post_activation_due_items_completion_check",
      ]),
    );
  });

  it("keeps scheduling and retry fields required", () => {
    const required = [
      "onboarding_id",
      "milestone_code",
      "status",
      "due_at",
      "available_at",
      "priority",
      "attempts",
    ];
    for (const name of required) {
      expect(config.columns.find((column) => column.name === name)?.notNull)
        .toBe(true);
    }
  });

  it("keeps worker lock and diagnostics optional", () => {
    for (const name of ["locked_until", "locked_by", "last_error", "completed_at"]) {
      expect(config.columns.find((column) => column.name === name)?.notNull)
        .toBe(false);
    }
  });

  it("enables row-level security", () => {
    expect(config.enableRLS).toBe(true);
  });
});
