import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  commercialOnboardingExecutorTypeEnum,
  commercialOnboardingStatusEnum,
  commercialOnboardingSteps,
  commercialOnboardingStepStatusEnum,
  commercialOnboardings,
} from "@/drizzle/schema";

const indexNames = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).indexes.map((index) => index.config.name).sort();

const checkNames = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).checks.map((check) => check.name).sort();

describe("commercial onboarding schema", () => {
  it("defines explicit lifecycle and executor enums", () => {
    expect(commercialOnboardingStatusEnum.enumValues).toEqual([
      "pending",
      "in_progress",
      "blocked",
      "completed",
      "cancelled",
    ]);
    expect(commercialOnboardingStepStatusEnum.enumValues).toEqual([
      "pending",
      "in_progress",
      "blocked",
      "completed",
      "skipped",
      "cancelled",
    ]);
    expect(commercialOnboardingExecutorTypeEnum.enumValues).toEqual([
      "human",
      "agent",
      "system",
      "n8n",
    ]);
  });

  it("keeps exactly one onboarding per commercial client", () => {
    expect(indexNames(commercialOnboardings)).toContain(
      "commercial_onboardings_client_uq",
    );
  });

  it("indexes onboarding orchestration state", () => {
    expect(indexNames(commercialOnboardings)).toEqual(
      expect.arrayContaining([
        "commercial_onboardings_current_step_idx",
        "commercial_onboardings_status_idx",
      ]),
    );
    expect(checkNames(commercialOnboardings)).toContain(
      "commercial_onboardings_step_code_format_check",
    );
  });

  it("prevents duplicate step codes and positions", () => {
    expect(indexNames(commercialOnboardingSteps)).toEqual(
      expect.arrayContaining([
        "commercial_onboarding_steps_onboarding_code_uq",
        "commercial_onboarding_steps_onboarding_position_uq",
      ]),
    );
  });

  it("indexes pending work by onboarding and executor", () => {
    expect(indexNames(commercialOnboardingSteps)).toEqual(
      expect.arrayContaining([
        "commercial_onboarding_steps_executor_idx",
        "commercial_onboarding_steps_onboarding_status_idx",
      ]),
    );
  });

  it("guards step identity, ordering and retry counters", () => {
    expect(checkNames(commercialOnboardingSteps)).toEqual([
      "commercial_onboarding_steps_attempts_check",
      "commercial_onboarding_steps_code_format_check",
      "commercial_onboarding_steps_position_check",
    ]);
  });

  it("enables RLS on onboarding tables", () => {
    expect(getTableConfig(commercialOnboardings).enableRLS).toBe(true);
    expect(getTableConfig(commercialOnboardingSteps).enableRLS).toBe(true);
  });
});
