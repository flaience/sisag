import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { commercialPostActivationAlertSlaSignalOccurrences } from "@/drizzle/schema";

describe("commercial post-activation alert SLA signal occurrences schema", () => {
  const config = getTableConfig(commercialPostActivationAlertSlaSignalOccurrences);

  it("keeps each signal key idempotent", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_post_activation_alert_sla_signal_occurrences_signal_uq",
    );
  });

  it("indexes active signals and alert history", () => {
    expect(config.indexes.map((item) => item.config.name)).toEqual(expect.arrayContaining([
      "commercial_post_activation_alert_sla_signal_occurrences_active_idx",
      "commercial_post_activation_alert_sla_signal_occurrences_alert_idx",
    ]));
  });

  it("guards identity, classification and temporal order", () => {
    expect(config.checks.map((item) => item.name)).toEqual(expect.arrayContaining([
      "commercial_post_activation_alert_sla_signal_occurrences_key_not_blank_check",
      "commercial_post_activation_alert_sla_signal_occurrences_type_check",
      "commercial_post_activation_alert_sla_signal_occurrences_severity_check",
      "commercial_post_activation_alert_sla_signal_occurrences_observed_order_check",
      "commercial_post_activation_alert_sla_signal_occurrences_resolved_order_check",
    ]));
  });

  it("enables row-level security", () => {
    expect(config.enableRLS).toBe(true);
  });
});
