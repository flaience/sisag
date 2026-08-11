import { describe, expect, it, vi } from "vitest";

import { createCommercialOnboardingSchedulingAdapter } from "./commercial-onboarding-scheduling.adapter";

const command = {
  key: "23164020-8778-4226-afed-189e8d2333cc:configure_scheduling:start",
  action: "start" as const,
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  stepCode: "configure_scheduling",
  stepPosition: 3,
  executorType: "agent" as const,
  input: {},
};

function setup(options: { target?: object | null; saved?: object | null } = {}) {
  const store = {
    findTarget: vi.fn().mockResolvedValue(
      options.target === undefined
        ? { tenantId: "tenant-1", companyId: "company-1" }
        : options.target,
    ),
    saveConfig: vi.fn().mockResolvedValue(
      options.saved === undefined ? { id: "config-1" } : options.saved,
    ),
  };

  return {
    store,
    adapter: createCommercialOnboardingSchedulingAdapter({ store }),
  };
}

describe("commercial onboarding scheduling adapter", () => {
  it("creates the safe default scheduling configuration", async () => {
    const { adapter, store } = setup();

    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "completed",
      result: {
        schedulingConfigId: "config-1",
        tenantId: "tenant-1",
        companyId: "company-1",
        configuration: {
          timezone: "America/Sao_Paulo",
          slotDurationMinutes: 15,
          bufferMinutes: 5,
          allowOverbooking: false,
          maxAdvanceDays: 30,
          minCancelAdvanceMinutes: 0,
        },
      },
    });
    expect(store.saveConfig).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({ timezone: "America/Sao_Paulo" }),
    );
  });

  it("applies validated overrides from the command", async () => {
    const { adapter, store } = setup();
    await adapter.execute({
      ...command,
      input: {
        schedulingConfig: {
          timezone: "America/Manaus",
          slotDurationMinutes: 30,
          bufferMinutes: 10,
        },
      },
    });

    expect(store.saveConfig).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        timezone: "America/Manaus",
        slotDurationMinutes: 30,
        bufferMinutes: 10,
      }),
    );
  });

  it("requires human review for invalid configuration", async () => {
    const { adapter, store } = setup();
    await expect(
      adapter.execute({
        ...command,
        input: { schedulingConfig: { timezone: "Invalid/Timezone" } },
      }),
    ).resolves.toMatchObject({
      outcome: "human_required",
      error: expect.any(String),
    });
    expect(store.findTarget).not.toHaveBeenCalled();
  });

  it("blocks when the commercial company cannot be resolved", async () => {
    const { adapter, store } = setup({ target: null });
    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "blocked",
      error: "commercial_company_not_found",
    });
    expect(store.saveConfig).not.toHaveBeenCalled();
  });

  it("fails when the upsert returns no configuration", async () => {
    const { adapter } = setup({ saved: null });
    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "failed",
      error: "scheduling_configuration_not_saved",
    });
  });

  it("rejects commands for another step", async () => {
    const { adapter, store } = setup();
    await expect(
      adapter.execute({ ...command, stepCode: "configure_company" }),
    ).resolves.toMatchObject({
      outcome: "failed",
      error: "unsupported_scheduling_command",
    });
    expect(store.findTarget).not.toHaveBeenCalled();
  });
});
