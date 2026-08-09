import { describe, expect, it, vi } from "vitest";

import {
  COMMERCIAL_ONBOARDING_STEPS,
  initializeCommercialOnboarding,
  type InitializeCommercialOnboardingInput,
} from "./commercial-onboarding.service";

const input: InitializeCommercialOnboardingInput = {
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  actor: { type: "human", id: "2d3a4184-d8f8-4dfa-a694-466d15f950ee" },
  reason: "Início oficial do onboarding",
  input: { source: "commercial" },
};

function createStore(options: {
  clientStatus?: "prospect" | "onboarding" | "active" | "suspended" | "closed";
  clientMissing?: boolean;
  onboardingExists?: boolean;
  reconciledSteps?: number;
  emitted?: boolean;
} = {}) {
  const onboarding = {
    id: "11111111-1111-4111-8111-111111111111",
    commercialClientId: input.commercialClientId,
    status: "pending" as const,
    currentStepCode: "validate_registration",
    createdAt: new Date("2026-08-09T12:00:00.000Z"),
  };
  const tx = {
    findClientForUpdate: vi.fn().mockResolvedValue(
      options.clientMissing
        ? null
        : {
            id: input.commercialClientId,
            status: options.clientStatus ?? "onboarding",
          },
    ),
    markClientOnboarding: vi.fn().mockResolvedValue(undefined),
    findByClient: vi
      .fn()
      .mockResolvedValue(options.onboardingExists ? onboarding : null),
    createOnboarding: vi.fn().mockResolvedValue(onboarding),
    ensureSteps: vi
      .fn()
      .mockResolvedValue(options.reconciledSteps ?? COMMERCIAL_ONBOARDING_STEPS.length),
    emitCreated: vi.fn().mockResolvedValue(options.emitted ?? true),
  };
  const store = {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  return { store, tx, onboarding };
}

describe("commercial onboarding initialization", () => {
  it("defines a stable and ordered catalog of eight steps", () => {
    expect(COMMERCIAL_ONBOARDING_STEPS).toHaveLength(8);
    expect(COMMERCIAL_ONBOARDING_STEPS.map((step) => step.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(COMMERCIAL_ONBOARDING_STEPS[0].code).toBe("validate_registration");
    expect(COMMERCIAL_ONBOARDING_STEPS[7].code).toBe("complete_onboarding");
  });

  it("validates input before opening a transaction", async () => {
    const { store } = createStore();

    await expect(
      initializeCommercialOnboarding({ ...input, reason: "x" }, { store }),
    ).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("creates an onboarding, reconciles all steps and emits one event", async () => {
    const { store, tx, onboarding } = createStore();
    const now = new Date("2026-08-09T12:00:00.000Z");

    await expect(
      initializeCommercialOnboarding(input, { store, now: () => now }),
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      reconciledSteps: 8,
      onboarding: {
        id: onboarding.id,
        commercialClientId: input.commercialClientId,
        status: "pending",
        currentStepCode: "validate_registration",
        totalSteps: 8,
      },
      emittedEvents: ["commercial.onboarding.created"],
    });
    expect(tx.ensureSteps).toHaveBeenCalledWith(
      expect.objectContaining({ steps: COMMERCIAL_ONBOARDING_STEPS }),
    );
    expect(tx.emitCreated).toHaveBeenCalledWith(
      expect.objectContaining({ actor: input.actor, reason: input.reason }),
    );
  });

  it("replays safely without duplicating steps or events", async () => {
    const { store, tx } = createStore({
      onboardingExists: true,
      reconciledSteps: 0,
      emitted: false,
    });

    await expect(initializeCommercialOnboarding(input, { store })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      reconciledSteps: 0,
      emittedEvents: [],
    });
    expect(tx.createOnboarding).not.toHaveBeenCalled();
  });

  it("repairs missing catalog steps on an existing onboarding", async () => {
    const { store } = createStore({
      onboardingExists: true,
      reconciledSteps: 2,
      emitted: false,
    });

    await expect(initializeCommercialOnboarding(input, { store })).resolves.toMatchObject({
      ok: true,
      replayed: false,
      reconciledSteps: 2,
      emittedEvents: [],
    });
  });

  it("promotes a prospect to onboarding inside the transaction", async () => {
    const { store, tx } = createStore({ clientStatus: "prospect" });

    await initializeCommercialOnboarding(input, { store });

    expect(tx.markClientOnboarding).toHaveBeenCalledWith(
      input.commercialClientId,
      expect.any(Date),
    );
  });

  it.each(["suspended", "closed"] as const)(
    "rejects an ineligible %s client",
    async (clientStatus) => {
      const { store, tx } = createStore({ clientStatus });

      await expect(initializeCommercialOnboarding(input, { store })).resolves.toMatchObject({
        ok: false,
        error: "commercial_client_not_eligible",
      });
      expect(tx.createOnboarding).not.toHaveBeenCalled();
    },
  );

  it("returns not found without creating workflow records", async () => {
    const { store, tx } = createStore({ clientMissing: true });

    await expect(initializeCommercialOnboarding(input, { store })).resolves.toMatchObject({
      ok: false,
      error: "commercial_client_not_found",
    });
    expect(tx.createOnboarding).not.toHaveBeenCalled();
  });
});
