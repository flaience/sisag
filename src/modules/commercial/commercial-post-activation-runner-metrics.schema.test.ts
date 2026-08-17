import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";

describe("commercial post-activation runner metrics schema", () => {
  const config = getTableConfig(commercialPostActivationRunnerRuns);

  it("keeps every execution idempotent", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_post_activation_runner_runs_execution_uq",
    );
  });

  it("indexes the latest execution of each runner", () => {
    expect(config.indexes.map((item) => item.config.name)).toContain(
      "commercial_post_activation_runner_runs_runner_executed_idx",
    );
  });

  it("guards runner and execution identity", () => {
    expect(config.checks.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "commercial_post_activation_runner_runs_runner_key_format_check",
        "commercial_post_activation_runner_runs_execution_key_not_blank_check",
      ]),
    );
  });

  it("enables row-level security", () => {
    expect(config.enableRLS).toBe(true);
  });
});
