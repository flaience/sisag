import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import { commercialPostActivationAlertOccurrences } from "@/drizzle/schema";

describe("commercial post-activation alert occurrences schema", () => {
  const config = getTableConfig(commercialPostActivationAlertOccurrences);

  it("keeps each alert key idempotent", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_post_activation_alert_occurrences_alert_uq",
    );
  });

  it("indexes active alerts and onboarding history", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(
      expect.arrayContaining([
        "commercial_post_activation_alert_occurrences_active_idx",
        "commercial_post_activation_alert_occurrences_onboarding_idx",
      ]),
    );
  });

  it("guards identity, classification and temporal order", () => {
    expect(config.checks.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "commercial_post_activation_alert_occurrences_alert_key_not_blank_check",
        "commercial_post_activation_alert_occurrences_severity_check",
        "commercial_post_activation_alert_occurrences_category_check",
        "commercial_post_activation_alert_occurrences_observed_order_check",
        "commercial_post_activation_alert_occurrences_resolved_order_check",
      ]),
    );
  });

  it("enables row-level security", () => {
    expect(config.enableRLS).toBe(true);
  });
});
