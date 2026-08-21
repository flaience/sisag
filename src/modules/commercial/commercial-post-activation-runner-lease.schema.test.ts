import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import { commercialPostActivationRunnerLeases } from "@/drizzle/schema";

describe("commercial post-activation runner lease schema", () => {
  const config = getTableConfig(commercialPostActivationRunnerLeases);

  it("uses the runner identity as the primary key", () => {
    expect(config.columns.find((column) => column.name === "runner_key")?.primary)
      .toBe(true);
  });

  it("indexes expired leases for operational cleanup", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_post_activation_runner_leases_expires_idx",
    );
  });

  it("guards identity and expiration order", () => {
    expect(config.checks.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "commercial_post_activation_runner_leases_runner_key_check",
        "commercial_post_activation_runner_leases_owner_key_check",
        "commercial_post_activation_runner_leases_expiry_check",
      ]),
    );
  });

  it("stores the ownership timestamps", () => {
    expect(config.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "owner_key",
        "acquired_at",
        "expires_at",
        "updated_at",
      ]),
    );
  });

  it("enables row-level security", () => {
    expect(config.enableRLS).toBe(true);
  });
});
