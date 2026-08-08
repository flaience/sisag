import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  provisionCommercialAccount,
  type ProvisionCommercialAccountInput,
} from "./commercial-provisioning.service";

const input: ProvisionCommercialAccountInput = {
  tenantId: "7e91fac1-b570-425f-af16-300cdf5e4684",
  ownerUserId: "2d3a4184-d8f8-4dfa-a694-466d15f950ee",
  legalName: "Clínica Exemplo LTDA",
  tradeName: "Clínica Exemplo",
  documentNumber: "12.345.678/0001-90",
  email: "CONTATO@EXEMPLO.COM",
};

function createStore(options: {
  tenantExists?: boolean;
  client?: { id: string; status: "onboarding" } | null;
  subscription?: {
    id: string;
    commercialClientId: string;
    tenantId: string;
    planCode: string;
    status: "trial";
    provisioningStatus: "completed";
  } | null;
  tenantSubscription?: {
    id: string;
    commercialClientId: string;
    tenantId: string;
    planCode: string;
    status: "trial";
    provisioningStatus: "completed";
  } | null;
  emitted?: boolean;
} = {}) {
  const createdClient = { id: "client-1", status: "onboarding" as const };
  const createdSubscription = {
    id: "subscription-1",
    commercialClientId: "client-1",
    tenantId: input.tenantId,
    planCode: "standard",
    status: "trial" as const,
    provisioningStatus: "completed" as const,
  };
  const tx = {
    tenantExists: vi.fn().mockResolvedValue(options.tenantExists ?? true),
    findClientByDocument: vi.fn().mockResolvedValue(options.client ?? null),
    createClient: vi.fn().mockResolvedValue(createdClient),
    findSubscriptionByClient: vi
      .fn()
      .mockResolvedValue(options.subscription ?? null),
    findSubscriptionByTenant: vi
      .fn()
      .mockResolvedValue(options.tenantSubscription ?? null),
    createSubscription: vi.fn().mockResolvedValue(createdSubscription),
    ensureOwner: vi.fn().mockResolvedValue(undefined),
    emitProvisioned: vi.fn().mockResolvedValue(options.emitted ?? true),
  };
  const store = {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  return { store, tx };
}

describe("commercial account provisioning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates and normalizes commercial input before opening a transaction", async () => {
    const { store } = createStore();

    await expect(
      provisionCommercialAccount(
        { ...input, documentNumber: "123" },
        { store },
      ),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("provisions client, trial subscription, owner and outbox atomically", async () => {
    const { store, tx } = createStore();
    const now = new Date("2026-08-08T12:00:00.000Z");

    await expect(
      provisionCommercialAccount(input, { store, now: () => now }),
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      client: { id: "client-1", status: "onboarding" },
      subscription: {
        id: "subscription-1",
        tenantId: input.tenantId,
        planCode: "standard",
        status: "trial",
        provisioningStatus: "completed",
      },
      owner: { userId: input.ownerUserId, role: "owner", isActive: true },
      emittedEvents: ["commercial.account.provisioned"],
    });
    expect(tx.createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        documentNumber: "12345678000190",
        email: "contato@exemplo.com",
      }),
    );
    expect(tx.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        trialStartsAt: now,
        trialEndsAt: new Date("2026-08-22T12:00:00.000Z"),
      }),
    );
    expect(tx.ensureOwner).toHaveBeenCalledTimes(1);
    expect(tx.emitProvisioned).toHaveBeenCalledTimes(1);
  });

  it("returns a safe replay without duplicating persisted records or events", async () => {
    const subscription = {
      id: "subscription-1",
      commercialClientId: "client-1",
      tenantId: input.tenantId,
      planCode: "standard",
      status: "trial" as const,
      provisioningStatus: "completed" as const,
    };
    const { store, tx } = createStore({
      client: { id: "client-1", status: "onboarding" },
      subscription,
      tenantSubscription: subscription,
      emitted: false,
    });

    await expect(provisionCommercialAccount(input, { store })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      emittedEvents: [],
    });
    expect(tx.createClient).not.toHaveBeenCalled();
    expect(tx.createSubscription).not.toHaveBeenCalled();
    expect(tx.ensureOwner).toHaveBeenCalledTimes(1);
  });

  it("rejects a document that is already bound to another tenant", async () => {
    const subscription = {
      id: "subscription-1",
      commercialClientId: "client-1",
      tenantId: "11111111-1111-4111-8111-111111111111",
      planCode: "standard",
      status: "trial" as const,
      provisioningStatus: "completed" as const,
    };
    const { store, tx } = createStore({
      client: { id: "client-1", status: "onboarding" },
      subscription,
    });

    await expect(provisionCommercialAccount(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "commercial_conflict",
    });
    expect(tx.ensureOwner).not.toHaveBeenCalled();
    expect(tx.emitProvisioned).not.toHaveBeenCalled();
  });

  it("rejects provisioning when the tenant does not exist", async () => {
    const { store, tx } = createStore({ tenantExists: false });

    await expect(provisionCommercialAccount(input, { store })).resolves.toEqual({
      ok: false,
      error: "tenant_not_found",
      message: "O tenant informado não foi encontrado.",
    });
    expect(tx.createClient).not.toHaveBeenCalled();
  });
});
