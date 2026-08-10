import { describe, expect, it, vi } from "vitest";

import { planCommercialOnboardingExecution } from "./commercial-onboarding-executor.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";

function queryResult(options: {
  onboardingStatus?: "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  stepStatus?: "pending" | "in_progress" | "blocked";
  executorType?: "human" | "agent" | "system" | "n8n";
  currentStep?: boolean;
} = {}) {
  const status = options.stepStatus ?? "pending";
  const step = {
    id: "step-2", code: "configure_company", position: 2, title: "Configuração da empresa",
    status, executorType: options.executorType ?? "agent", executorId: null, attempts: 0,
    lastError: status === "blocked" ? "Pré-condição ausente" : null,
    input: { companyId: "company-1" }, result: null, startedAt: null, completedAt: null,
    updatedAt: new Date(), isCurrent: true,
    availableActions: status === "pending" ? ["start", "skip", "cancel"] : status === "in_progress" ? ["complete", "block", "cancel"] : ["resume", "skip", "cancel"],
  };
  return {
    ok: true as const,
    data: {
      onboarding: {
        id: onboardingId, commercialClientId, status: options.onboardingStatus ?? "in_progress",
        currentStepCode: options.currentStep === false ? null : step.code,
        blockedReason: options.onboardingStatus === "blocked" ? "Aguardando cadastro" : null,
        input: {}, result: null, startedAt: new Date(), completedAt: null, cancelledAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      },
      client: null,
      progress: { total: 8, completed: 1, pending: 7, percentage: 13 },
      currentStep: options.currentStep === false ? null : step,
      steps: options.currentStep === false ? [] : [step],
    },
  };
}

describe("commercial onboarding executor planner", () => {
  it("validates identifiers before querying", async () => {
    const query = vi.fn();
    await expect(planCommercialOnboardingExecution({}, { query })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    ["system", "execute_system"],
    ["agent", "execute_agent"],
    ["n8n", "dispatch_n8n"],
  ] as const)("plans a pending %s step as %s", async (executorType, decision) => {
    const query = vi.fn().mockResolvedValue(queryResult({ executorType }));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query })).resolves.toMatchObject({
      ok: true, decision,
      command: { key: `${onboardingId}:configure_company:start`, action: "start", executorType },
      snapshot: { progressPercentage: 13 },
    });
  });

  it("requests human intervention without emitting an automatic command", async () => {
    const query = vi.fn().mockResolvedValue(queryResult({ executorType: "human" }));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query })).resolves.toMatchObject({ ok: true, decision: "request_human", command: null });
  });

  it("waits when the current step is already in progress", async () => {
    const query = vi.fn().mockResolvedValue(queryResult({ stepStatus: "in_progress" }));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query })).resolves.toMatchObject({ ok: true, decision: "wait", command: null });
  });

  it("preserves a blocking reason", async () => {
    const query = vi.fn().mockResolvedValue(queryResult({ onboardingStatus: "blocked", stepStatus: "blocked" }));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query })).resolves.toMatchObject({ ok: true, decision: "blocked", reason: "Aguardando cadastro", command: null });
  });

  it.each(["completed", "cancelled"] as const)("finishes for a terminal %s onboarding", async (onboardingStatus) => {
    const query = vi.fn().mockResolvedValue(queryResult({ onboardingStatus, currentStep: false }));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query })).resolves.toMatchObject({ ok: true, decision: "finished", command: null });
  });

  it("waits safely when no current step is available", async () => {
    const query = vi.fn().mockResolvedValue(queryResult({ currentStep: false }));
    await expect(planCommercialOnboardingExecution({ commercialClientId }, { query })).resolves.toMatchObject({ ok: true, decision: "wait", command: null });
  });

  it("maps a missing onboarding and contains unexpected query failures", async () => {
    const missing = vi.fn().mockResolvedValue({ ok: false, error: "onboarding_not_found", message: "Não encontrado." });
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query: missing })).resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });
    const failed = vi.fn().mockRejectedValue(new Error("database secret"));
    await expect(planCommercialOnboardingExecution({ onboardingId }, { query: failed })).resolves.toEqual({ ok: false, error: "query_failed", message: "Não foi possível consultar o onboarding comercial." });
  });
});
