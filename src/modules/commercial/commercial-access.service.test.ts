import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDb: mocks.getDb,
}));

import {
  evaluateCommercialAccess,
  getCommercialAccessContext,
} from "./commercial-access.service";

function mockCommercialRows(rows: unknown[]) {
  mocks.limit.mockResolvedValue(rows);
  mocks.getDb.mockReturnValue({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({ limit: mocks.limit })),
          })),
        })),
      })),
    })),
  });
}

describe("commercial access shadow context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats active and trial subscriptions as entitled", () => {
    expect(
      evaluateCommercialAccess({
        clientStatus: "active",
        subscriptionStatus: "active",
      }),
    ).toEqual({ decision: "allowed", reason: "subscription_entitled" });

    expect(
      evaluateCommercialAccess({
        clientStatus: "onboarding",
        subscriptionStatus: "trial",
      }),
    ).toEqual({ decision: "allowed", reason: "subscription_entitled" });
  });

  it.each([
    ["pending", "subscription_pending"],
    ["past_due", "subscription_past_due"],
    ["suspended", "subscription_suspended"],
    ["cancelled", "subscription_cancelled"],
  ] as const)("reports %s subscriptions as restricted", (status, reason) => {
    expect(
      evaluateCommercialAccess({
        clientStatus: "active",
        subscriptionStatus: status,
      }),
    ).toEqual({ decision: "restricted", reason });
  });

  it("does not query the database without a tenant", async () => {
    await expect(
      getCommercialAccessContext({ tenantId: null, userId: "user-1" }),
    ).resolves.toMatchObject({
      decision: "unconfigured",
      reason: "tenant_missing",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("keeps tenants without a subscription unconfigured", async () => {
    mockCommercialRows([]);

    await expect(
      getCommercialAccessContext({ tenantId: "tenant-1", userId: "user-1" }),
    ).resolves.toEqual({
      decision: "unconfigured",
      reason: "subscription_missing",
      client: null,
      subscription: null,
      user: null,
    });
  });

  it("returns subscription and commercial membership in shadow mode", async () => {
    mockCommercialRows([
      {
        clientId: "client-1",
        clientLegalName: "Clínica Exemplo LTDA",
        clientTradeName: "Clínica Exemplo",
        clientStatus: "active",
        subscriptionId: "subscription-1",
        subscriptionPlanCode: "standard",
        subscriptionStatus: "active",
        subscriptionProvisioningStatus: "completed",
        subscriptionUserRole: "owner",
        subscriptionUserIsActive: true,
      },
    ]);

    await expect(
      getCommercialAccessContext({ tenantId: "tenant-1", userId: "user-1" }),
    ).resolves.toEqual({
      decision: "allowed",
      reason: "subscription_entitled",
      client: {
        id: "client-1",
        legalName: "Clínica Exemplo LTDA",
        tradeName: "Clínica Exemplo",
        status: "active",
      },
      subscription: {
        id: "subscription-1",
        planCode: "standard",
        status: "active",
        provisioningStatus: "completed",
      },
      user: { role: "owner", isActive: true },
    });
  });
});
