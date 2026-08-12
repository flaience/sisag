import { describe, expect, it, vi } from "vitest";

import { createCommercialOnboardingChannelsAdapter } from "./commercial-onboarding-channels.adapter";

const command = {
  key: "23164020-8778-4226-afed-189e8d2333cc:configure_channels:start",
  action: "start" as const,
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  stepCode: "configure_channels",
  stepPosition: 5,
  executorType: "agent" as const,
  input: {},
};

function setup(
  options: {
    target?: object | null;
    accounts?: Array<{ id: string; provider: string; status: string }>;
  } = {},
) {
  const store = {
    findTarget: vi.fn().mockResolvedValue(
      options.target === undefined
        ? { tenantId: "tenant-1", companyId: "company-1" }
        : options.target,
    ),
    listAccounts: vi.fn().mockResolvedValue(
      options.accounts ?? [
        { id: "account-1", provider: "meta", status: "active" },
      ],
    ),
  };

  return {
    store,
    adapter: createCommercialOnboardingChannelsAdapter({ store }),
  };
}

describe("commercial onboarding channels adapter", () => {
  it("completes when an active WhatsApp account exists", async () => {
    const { adapter, store } = setup();

    await expect(adapter.execute(command)).resolves.toEqual({
      outcome: "completed",
      reason: "Os canais ativos da empresa foram localizados e validados.",
      result: {
        tenantId: "tenant-1",
        companyId: "company-1",
        configuredChannels: [
          { id: "account-1", provider: "meta", status: "active" },
        ],
        activeChannelCount: 1,
      },
    });
    expect(store.listAccounts).toHaveBeenCalledWith("company-1");
  });

  it("normalizes provider and status before validating", async () => {
    const { adapter } = setup({
      accounts: [{ id: "account-1", provider: " Meta ", status: " ACTIVE " }],
    });

    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "completed",
      result: {
        configuredChannels: [
          { id: "account-1", provider: "meta", status: "active" },
        ],
      },
    });
  });

  it("requires human action when no channel exists", async () => {
    const { adapter } = setup({ accounts: [] });

    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "human_required",
      error: "active_whatsapp_channel_required",
      result: {
        configuredChannels: [],
        requiredAction: "activate_whatsapp_channel",
      },
    });
  });

  it("requires human action when all channels are inactive", async () => {
    const { adapter } = setup({
      accounts: [{ id: "account-1", provider: "meta", status: "pending" }],
    });

    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "human_required",
      result: {
        configuredChannels: [
          { id: "account-1", provider: "meta", status: "pending" },
        ],
      },
    });
  });

  it("blocks when the commercial company cannot be resolved", async () => {
    const { adapter, store } = setup({ target: null });

    await expect(adapter.execute(command)).resolves.toMatchObject({
      outcome: "blocked",
      error: "commercial_company_not_found",
    });
    expect(store.listAccounts).not.toHaveBeenCalled();
  });

  it("rejects commands for another step", async () => {
    const { adapter, store } = setup();

    await expect(
      adapter.execute({ ...command, stepCode: "configure_scheduling" }),
    ).resolves.toMatchObject({
      outcome: "failed",
      error: "unsupported_channels_command",
    });
    expect(store.findTarget).not.toHaveBeenCalled();
  });
});
