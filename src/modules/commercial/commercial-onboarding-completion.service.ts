import { z } from "zod";

import { getCommercialOnboardingQuery } from "./commercial-onboarding-query.service";
import { transitionCommercialOnboardingStep } from "./commercial-onboarding-workflow.service";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  actor: z.object({
    type: z.enum(["human", "agent", "system", "n8n"]),
    id: z.string().trim().min(1).max(200),
  }),
  reason: z.string().trim().min(3).max(500),
  result: z.record(z.string(), z.unknown()).optional(),
});

export type CompleteCommercialOnboardingInput = z.input<typeof inputSchema>;

type Dependencies = {
  query: typeof getCommercialOnboardingQuery;
  transition: typeof transitionCommercialOnboardingStep;
};

export type CompleteCommercialOnboardingResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      status: "completed";
      clientStatus: "active" | null;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "completion_not_available"
        | "completion_requirements_not_met"
        | "transition_failed"
        | "query_failed";
      message: string;
    };

export async function completeCommercialOnboarding(
  rawInput: CompleteCommercialOnboardingInput,
  dependencies: Partial<Dependencies> = {},
): Promise<CompleteCommercialOnboardingResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados de conclusão inválidos.",
    };
  }

  const input = parsed.data;
  const query = dependencies.query ?? getCommercialOnboardingQuery;
  const transition = dependencies.transition ?? transitionCommercialOnboardingStep;
  const current = await query({ onboardingId: input.onboardingId });
  if (current.ok === false) {
    return current.error === "onboarding_not_found"
      ? { ok: false, error: "onboarding_not_found", message: current.message }
      : { ok: false, error: "query_failed", message: current.message };
  }

  if (current.data.onboarding.status === "completed") {
    return {
      ok: true,
      replayed: true,
      onboardingId: input.onboardingId,
      status: "completed",
      clientStatus: current.data.client?.status === "active" ? "active" : null,
      emittedEvents: [],
    };
  }

  const finalStep = current.data.steps.find((step) => step.code === "complete_onboarding");
  if (
    current.data.onboarding.currentStepCode !== "complete_onboarding"
    || !finalStep
    || !["pending", "in_progress"].includes(finalStep.status)
  ) {
    return {
      ok: false,
      error: "completion_not_available",
      message: "O onboarding ainda não está posicionado para conclusão.",
    };
  }

  const emittedEvents: string[] = [];
  if (finalStep.status === "pending") {
    const started = await transition({
      onboardingId: input.onboardingId,
      stepCode: "complete_onboarding",
      action: "start",
      actor: input.actor,
      reason: input.reason,
    });
    if (started.ok === false) {
      return { ok: false, error: "transition_failed", message: started.message };
    }
    emittedEvents.push(...started.emittedEvents);
  }

  const completed = await transition({
    onboardingId: input.onboardingId,
    stepCode: "complete_onboarding",
    action: "complete",
    actor: input.actor,
    reason: input.reason,
    result: input.result,
  });
  if (completed.ok === false) {
    return completed.error === "completion_requirements_not_met"
      ? { ok: false, error: "completion_requirements_not_met", message: completed.message }
      : { ok: false, error: "transition_failed", message: completed.message };
  }
  emittedEvents.push(...completed.emittedEvents);

  return {
    ok: true,
    replayed: completed.replayed,
    onboardingId: input.onboardingId,
    status: "completed",
    clientStatus: "active",
    emittedEvents,
  };
}

