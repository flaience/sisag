import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  commercialClients,
  commercialClientStatusEnum,
  subscriptionProvisioningStatusEnum,
  subscriptions,
  subscriptionStatusEnum,
  subscriptionUserRoleEnum,
  subscriptionUsers,
} from "@/drizzle/schema";

function indexNames(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((item) => item.config.name);
}

describe("commercial access database foundation", () => {
  it("defines stable commercial lifecycle enums", () => {
    expect(commercialClientStatusEnum.enumValues).toEqual([
      "prospect",
      "onboarding",
      "active",
      "suspended",
      "closed",
    ]);
    expect(subscriptionStatusEnum.enumValues).toEqual([
      "pending",
      "trial",
      "active",
      "past_due",
      "suspended",
      "cancelled",
    ]);
    expect(subscriptionProvisioningStatusEnum.enumValues).toEqual([
      "pending",
      "processing",
      "completed",
      "failed",
    ]);
    expect(subscriptionUserRoleEnum.enumValues).toEqual([
      "owner",
      "billing",
      "administrator",
    ]);
  });

  it("enables RLS for every commercial table", () => {
    expect(getTableConfig(commercialClients).enableRLS).toBe(true);
    expect(getTableConfig(subscriptions).enableRLS).toBe(true);
    expect(getTableConfig(subscriptionUsers).enableRLS).toBe(true);
  });

  it("protects commercial client identity and document integrity", () => {
    const config = getTableConfig(commercialClients);

    expect(config.name).toBe("commercial_clients");
    expect(indexNames(commercialClients)).toEqual(
      expect.arrayContaining([
        "commercial_clients_document_uq",
        "commercial_clients_email_idx",
        "commercial_clients_status_idx",
      ]),
    );
    expect(config.checks.map((item) => item.name)).toContain(
      "commercial_clients_document_format_check",
    );
  });

  it("allows only one SISAG subscription per client and tenant", () => {
    const config = getTableConfig(subscriptions);

    expect(config.name).toBe("subscriptions");
    expect(indexNames(subscriptions)).toEqual(
      expect.arrayContaining([
        "subscriptions_commercial_client_uq",
        "subscriptions_tenant_uq",
        "subscriptions_status_idx",
        "subscriptions_provisioning_status_idx",
      ]),
    );
    expect(config.foreignKeys).toHaveLength(2);
    expect(config.checks.map((item) => item.name)).toContain(
      "subscriptions_trial_period_check",
    );
  });

  it("prevents duplicate commercial memberships", () => {
    const config = getTableConfig(subscriptionUsers);

    expect(config.name).toBe("subscription_users");
    expect(indexNames(subscriptionUsers)).toEqual(
      expect.arrayContaining([
        "subscription_users_client_user_uq",
        "subscription_users_user_idx",
        "subscription_users_client_active_idx",
      ]),
    );
    expect(config.foreignKeys).toHaveLength(1);
  });
});
