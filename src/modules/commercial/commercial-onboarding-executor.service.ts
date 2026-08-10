import { z } from "zod";

import {
  getCommercialOnboardingQuery,
  type GetCommercialOnboardingQueryInput,
  type GetCommercialOnboardingQueryResult,
} from "./commercial-onboarding-query.service";

export const planCommercialOnboardingExecutionInputSchema = z
  .object({
    onboardingId: z.string().uuid().optional(),
    commercialClientId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.onboardingId) !== Boolean(value.commercialClientId), {
    message: "Informe exatamente onboardingId ou commercialClientId.",
  });

export type PlanCommercialOnboardingExecutionInput = z.input<
  typeof planCommercialOnboardingExecutionInputSchema
>;

export type CommercialOnboardingExecutionDecision =
  | "execute_system"
  | "execute_agent"
  | "dispatch_n8n"
  | "request_human"
  | "wait"
  | "blocked"
  | "finished";

type SuccessfulQuery = Extract<GetCommercialOnboardingQueryResult, { ok: true }>;
type CurrentStep = NonNullable<SuccessfulQuery["data"]["currentStep"]>;
type Query = (
  input: GetCommercialOnboardingQueryInput,
) => Promise<GetCommercialOnboardingQueryResult>;

export type PlanCommercialOnboardingExecutionResult =
  | {
      ok: true;
      decision: CommercialOnboardingExecutionDecision;
      reason: string;
      command: {
        key: string;
        action: "start";
        onboardingId: string;
        commercialClientId: string;
        stepCode: string;
        stepPosition: number;
        executorType: CurrentStep["executorType"];
        input: unknown;
      } | null;
      snapshot: {
        onboardingStatus: SuccessfulQuery["data"]["onboarding"]["status"];
        currentStepCode: string | null;
        progressPercentage: number;
      };
    }
  | {
      ok: false;
      error: "invalid_input" | "onboarding_not_found" | "query_failed";
      message: string;
    };

function decisionForExecutor(executorType: CurrentStep["executorType"]) {
  const mapping = {
    system: "execute_system",
    agent: "execute_agent",
    n8n: "dispatch_n8n",
    human: "request_human",
  } as const;
  return mapping[executorType];
}

function reasonForDecision(decision: CommercialOnboardingExecutionDecision) {
  const reasons: Record<CommercialOnboardingExecutionDecision, string> = {
    execute_system: "A etapa atual está pronta para execução pelo sistema.",
    execute_agent: "A etapa atual está pronta para execução por um agente.",
    dispatch_n8n: "A etapa atual está pronta para encaminhamento ao n8n.",
    request_human: "A etapa atual requer intervenção humana.",
    wait: "A etapa atual já foi iniciada e deve aguardar conclusão.",
    blocked: "O onboarding ou sua etapa atual está bloqueado.",
    finished: "O onboarding está em estado terminal.",
  };
  return reasons[decision];
}

export async function planCommercialOnboardingExecution(
  rawInput: PlanCommercialOnboardingExecutionInput,
  options: { query?: Query } = {},
): Promise<PlanCommercialOnboardingExecutionResult> {
  const parsed = planCommercialOnboardingExecutionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Planejamento de onboarding inválido.",
    };
  }

  const query = options.query ?? getCommercialOnboardingQuery;
  let result: GetCommercialOnboardingQueryResult;
  try {
    result = await query(parsed.data);
  } catch {
    return { ok: false, error: "query_failed", message: "Não foi possível consultar o onboarding comercial." };
  }
  if (result.ok === false) {
    return result.error === "onboarding_not_found"
      ? { ok: false, error: "onboarding_not_found", message: result.message }
      : { ok: false, error: "invalid_input", message: result.message };
  }

  const { onboarding, currentStep, progress } = result.data;
  const snapshot = {
    onboardingStatus: onboarding.status,
    currentStepCode: onboarding.currentStepCode,
    progressPercentage: progress.percentage,
  };

  if (onboarding.status === "completed" || onboarding.status === "cancelled") {
    return { ok: true, decision: "finished", reason: reasonForDecision("finished"), command: null, snapshot };
  }
  if (onboarding.status === "blocked" || currentStep?.status === "blocked") {
    return { ok: true, decision: "blocked", reason: onboarding.blockedReason ?? currentStep?.lastError ?? reasonForDecision("blocked"), command: null, snapshot };
  }
  if (!currentStep) {
    return { ok: true, decision: "wait", reason: "O onboarding não possui uma etapa atual executável.", command: null, snapshot };
  }
  if (currentStep.status === "in_progress") {
    return { ok: true, decision: "wait", reason: reasonForDecision("wait"), command: null, snapshot };
  }
  if (currentStep.status !== "pending" || !currentStep.availableActions.includes("start")) {
    return { ok: true, decision: "wait", reason: "A etapa atual não está pronta para início.", command: null, snapshot };
  }

  const decision = decisionForExecutor(currentStep.executorType);
  const command = decision === "request_human"
    ? null
    : {
        key: `${onboarding.id}:${currentStep.code}:start`,
        action: "start" as const,
        onboardingId: onboarding.id,
        commercialClientId: onboarding.commercialClientId,
        stepCode: currentStep.code,
        stepPosition: currentStep.position,
        executorType: currentStep.executorType,
        input: currentStep.input,
      };
  return { ok: true, decision, reason: reasonForDecision(decision), command, snapshot };
}
