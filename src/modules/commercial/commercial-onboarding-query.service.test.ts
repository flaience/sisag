import { describe, expect, it, vi } from "vitest";

import { getCommercialOnboardingQuery } from "./commercial-onboarding-query.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const date = new Date("2026-08-09T23:33:19.815Z");

function createStore(options: { status?: "pending" | "in_progress" | "blocked" | "completed" | "cancelled"; current?: string | null; missing?: boolean; firstStatus?: "pending" | "in_progress" | "blocked" | "completed" } = {}) {
  const onboarding = {
    id: onboardingId,
    commercialClientId,
    status: options.status ?? "in_progress",
    currentStepCode: options.current === undefined ? "configure_company" : options.current,
    blockedReason: null,
    input: {}, result: null, startedAt: date, completedAt: null, cancelledAt: null,
    createdAt: date, updatedAt: date,
  };
  const base = { executorId: null, attempts: 0, lastError: null, input: {}, result: null, startedAt: null, completedAt: null, updatedAt: date };
  const steps = [
    { ...base, id: "step-1", code: "validate_registration", position: 1, title: "Validação cadastral", status: options.firstStatus ?? "completed", executorType: "system" as const },
    { ...base, id: "step-2", code: "configure_company", position: 2, title: "Configuração da empresa", status: "pending" as const, executorType: "agent" as const },
    { ...base, id: "step-3", code: "configure_scheduling", position: 3, title: "Configuração da agenda", status: "pending" as const, executorType: "agent" as const },
    { ...base, id: "step-4", code: "configure_team", position: 4, title: "Cadastro da equipe", status: "pending" as const, executorType: "human" as const },
  ];
  const store = {
    findOnboarding: vi.fn().mockResolvedValue(options.missing ? null : onboarding),
    findClient: vi.fn().mockResolvedValue({ id: commercialClientId, legalName: "Tenant Demo", tradeName: "Company Demo", status: "onboarding" }),
    listSteps: vi.fn().mockResolvedValue(steps),
  };
  return { store };
}

describe("commercial onboarding query", () => {
  it("requires exactly one identifier", async () => {
    const { store } = createStore();
    await expect(getCommercialOnboardingQuery({}, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    await expect(getCommercialOnboardingQuery({ onboardingId, commercialClientId }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.findOnboarding).not.toHaveBeenCalled();
  });

  it.each([{ onboardingId }, { commercialClientId }])("finds the workflow using one supported identifier", async (query) => {
    const { store } = createStore();
    await expect(getCommercialOnboardingQuery(query, { store })).resolves.toMatchObject({ ok: true });
    expect(store.findOnboarding).toHaveBeenCalledWith(query);
  });

  it("returns not found without querying related records", async () => {
    const { store } = createStore({ missing: true });
    await expect(getCommercialOnboardingQuery({ onboardingId }, { store })).resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });
    expect(store.findClient).not.toHaveBeenCalled();
    expect(store.listSteps).not.toHaveBeenCalled();
  });

  it("calculates progress and exposes actions only for the current step", async () => {
    const { store } = createStore();
    const result = await getCommercialOnboardingQuery({ onboardingId }, { store });
    expect(result).toMatchObject({
      ok: true,
      data: {
        progress: { total: 4, completed: 1, pending: 3, percentage: 25 },
        currentStep: { code: "configure_company", isCurrent: true, availableActions: ["start", "skip", "cancel"] },
      },
    });
    if (result.ok) expect(result.data.steps[2].availableActions).toEqual([]);
  });

  it.each([
    ["pending", ["start", "skip", "cancel"]],
    ["in_progress", ["complete", "block", "cancel"]],
    ["blocked", ["resume", "skip", "cancel"]],
  ] as const)("derives allowed actions for a %s current step", async (firstStatus, actions) => {
    const { store } = createStore({ current: "validate_registration", firstStatus });
    const result = await getCommercialOnboardingQuery({ onboardingId }, { store });
    if (!result.ok) throw new Error("Expected a successful query");
    expect(result.data.currentStep?.availableActions).toEqual(actions);
  });

  it.each(["completed", "cancelled"] as const)("does not expose actions for a terminal %s onboarding", async (status) => {
    const { store } = createStore({ status, current: null });
    const result = await getCommercialOnboardingQuery({ onboardingId }, { store });
    if (!result.ok) throw new Error("Expected a successful query");
    expect(result.data.currentStep).toBeNull();
    expect(result.data.steps.every((step) => step.availableActions.length === 0)).toBe(true);
  });

  it("handles an empty catalog without dividing by zero", async () => {
    const { store } = createStore();
    store.listSteps.mockResolvedValue([]);
    await expect(getCommercialOnboardingQuery({ onboardingId }, { store })).resolves.toMatchObject({ ok: true, data: { progress: { total: 0, completed: 0, pending: 0, percentage: 0 }, currentStep: null } });
  });
});
