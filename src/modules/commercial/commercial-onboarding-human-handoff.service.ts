import { z } from "zod";

import {
  getCommercialOnboardingQuery,
  type GetCommercialOnboardingQueryInput,
  type GetCommercialOnboardingQueryResult,
} from "./commercial-onboarding-query.service";
import {
  transitionCommercialOnboardingStep,
  type TransitionCommercialOnboardingStepInput,
  type TransitionCommercialOnboardingStepResult,
} from "./commercial-onboarding-workflow.service";

const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  role: z.enum(["owner", "admin", "manager", "professional", "receptionist"]),
  phone: z.string().trim().min(8).max(30).optional(),
});

export const submitCommercialOnboardingHumanHandoffInputSchema = z
  .object({
    onboardingId: z.string().uuid(),
    actor: z.object({
      id: z.string().trim().min(1).max(200),
      name: z.string().trim().min(2).max(120),
    }),
    team: z.array(teamMemberSchema).min(1).max(100),
    notes: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    const emails = new Set<string>();
    value.team.forEach((member, index) => {
      const email = member.email.toLowerCase();
      if (emails.has(email)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["team", index, "email"],
          message: "Cada integrante deve possuir um e-mail único.",
        });
      }
      emails.add(email);
    });
  });

export type SubmitCommercialOnboardingHumanHandoffInput = z.input<
  typeof submitCommercialOnboardingHumanHandoffInputSchema
>;

type Query = (
  input: GetCommercialOnboardingQueryInput,
) => Promise<GetCommercialOnboardingQueryResult>;
type Transition = (
  input: TransitionCommercialOnboardingStepInput,
) => Promise<TransitionCommercialOnboardingStepResult>;

export type SubmitCommercialOnboardingHumanHandoffResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      stepCode: "configure_team";
      nextStepCode: string | null;
      teamSize: number;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "query_failed"
        | "handoff_not_available"
        | "transition_failed";
      message: string;
    };

function failure(
  error: Extract<SubmitCommercialOnboardingHumanHandoffResult, { ok: false }>["error"],
  message: string,
): SubmitCommercialOnboardingHumanHandoffResult {
  return { ok: false, error, message };
}

export async function submitCommercialOnboardingHumanHandoff(
  rawInput: SubmitCommercialOnboardingHumanHandoffInput,
  options: { query?: Query; transition?: Transition } = {},
): Promise<SubmitCommercialOnboardingHumanHandoffResult> {
  const parsed = submitCommercialOnboardingHumanHandoffInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Dados do handoff humano inválidos.",
    );
  }

  const input = parsed.data;
  const query = options.query ?? getCommercialOnboardingQuery;
  const transition = options.transition ?? transitionCommercialOnboardingStep;
  let state: GetCommercialOnboardingQueryResult;
  try {
    state = await query({ onboardingId: input.onboardingId });
  } catch {
    return failure("query_failed", "Não foi possível consultar o onboarding comercial.");
  }
  if (state.ok === false) {
    return failure(
      state.error === "onboarding_not_found" ? "onboarding_not_found" : "invalid_input",
      state.message,
    );
  }

  const teamStep = state.data.steps.find((step) => step.code === "configure_team");
  if (teamStep?.status === "completed") {
    return {
      ok: true,
      replayed: true,
      onboardingId: input.onboardingId,
      stepCode: "configure_team",
      nextStepCode: state.data.onboarding.currentStepCode,
      teamSize: input.team.length,
      emittedEvents: [],
    };
  }

  const currentStep = state.data.currentStep;
  if (
    !currentStep ||
    currentStep.code !== "configure_team" ||
    currentStep.executorType !== "human" ||
    (currentStep.status !== "pending" && currentStep.status !== "in_progress")
  ) {
    return failure(
      "handoff_not_available",
      "O cadastro da equipe não é a etapa humana disponível neste onboarding.",
    );
  }

  const actor = { type: "human" as const, id: input.actor.id };
  const normalizedTeam = input.team.map((member) => ({
    ...member,
    email: member.email.toLowerCase(),
  }));
  const emittedEvents: string[] = [];

  if (currentStep.status === "pending") {
    const started = await transition({
      onboardingId: input.onboardingId,
      stepCode: "configure_team",
      action: "start",
      actor,
      reason: "Cadastro da equipe iniciado pelo responsável do cliente.",
      input: { teamSize: normalizedTeam.length },
    });
    if (started.ok === false) {
      return failure("transition_failed", started.message);
    }
    emittedEvents.push(...started.emittedEvents);
  }

  const completed = await transition({
    onboardingId: input.onboardingId,
    stepCode: "configure_team",
    action: "complete",
    actor,
    reason: "Composição inicial da equipe confirmada pelo responsável do cliente.",
    result: {
      team: normalizedTeam,
      teamSize: normalizedTeam.length,
      submittedBy: input.actor,
      ...(input.notes ? { notes: input.notes } : {}),
    },
  });
  if (completed.ok === false) {
    return failure("transition_failed", completed.message);
  }
  emittedEvents.push(...completed.emittedEvents);

  return {
    ok: true,
    replayed: completed.replayed,
    onboardingId: input.onboardingId,
    stepCode: "configure_team",
    nextStepCode: completed.onboarding.currentStepCode,
    teamSize: normalizedTeam.length,
    emittedEvents: [...new Set(emittedEvents)],
  };
}
