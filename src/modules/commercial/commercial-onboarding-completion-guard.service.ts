import { z } from "zod";

import {
  buildCommercialOnboardingGoLiveChecklist,
  commercialOnboardingGoLiveEvidenceSchema,
  evaluateCommercialOnboardingGoLive,
} from "./commercial-onboarding-go-live-validation.service";
import {
  buildCommercialOnboardingTrainingPlan,
  commercialOnboardingTrainingContextSchema,
  commercialOnboardingTrainingEvidenceSchema,
  evaluateCommercialOnboardingTraining,
} from "./commercial-onboarding-training.service";

const expectedSteps = [
  "validate_registration",
  "configure_company",
  "configure_scheduling",
  "configure_team",
  "configure_channels",
  "training",
  "go_live_validation",
  "complete_onboarding",
] as const;

type CompletionStep = {
  code: string;
  position: number;
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled";
  input: unknown;
};

export type CommercialOnboardingCompletionGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "invalid_step_sequence"
        | "previous_steps_incomplete"
        | "training_incomplete"
        | "go_live_incomplete";
      message: string;
    };

export function guardCommercialOnboardingCompletion(
  steps: CompletionStep[],
): CommercialOnboardingCompletionGuardResult {
  const ordered = [...steps].sort((left, right) => left.position - right.position);
  if (
    ordered.length !== expectedSteps.length
    || ordered.some((step, index) => step.position !== index + 1 || step.code !== expectedSteps[index])
  ) {
    return {
      allowed: false,
      reason: "invalid_step_sequence",
      message: "A sequência obrigatória do onboarding comercial está incompleta ou inválida.",
    };
  }

  if (ordered.slice(0, -1).some((step) => step.status !== "completed")) {
    return {
      allowed: false,
      reason: "previous_steps_incomplete",
      message: "Todas as etapas anteriores devem estar concluídas antes da ativação do cliente.",
    };
  }

  const trainingInput = z.object({
    trainingContext: commercialOnboardingTrainingContextSchema,
    trainingEvidence: z.array(commercialOnboardingTrainingEvidenceSchema),
  }).safeParse(ordered[5]?.input);
  const trainingPlan = trainingInput.success
    ? buildCommercialOnboardingTrainingPlan(trainingInput.data.trainingContext)
    : null;
  if (
    !trainingInput.success
    || !trainingPlan
    || !evaluateCommercialOnboardingTraining(trainingPlan, trainingInput.data.trainingEvidence).ready
  ) {
    return {
      allowed: false,
      reason: "training_incomplete",
      message: "O treinamento obrigatório não possui evidências suficientes para conclusão.",
    };
  }

  const goLiveInput = z.object({
    goLiveEvidence: z.array(commercialOnboardingGoLiveEvidenceSchema),
  }).safeParse(ordered[6]?.input);
  const checklist = buildCommercialOnboardingGoLiveChecklist();
  if (
    !goLiveInput.success
    || !evaluateCommercialOnboardingGoLive(checklist, goLiveInput.data.goLiveEvidence).ready
  ) {
    return {
      allowed: false,
      reason: "go_live_incomplete",
      message: "O checklist obrigatório de go-live não está integralmente aprovado.",
    };
  }

  return { allowed: true };
}

