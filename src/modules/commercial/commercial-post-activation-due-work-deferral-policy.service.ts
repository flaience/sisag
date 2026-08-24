import { z } from "zod";

export const COMMERCIAL_POST_ACTIVATION_MAX_DEFERRALS = 96;
export const COMMERCIAL_POST_ACTIVATION_MAX_WAIT_SECONDS = 86400;

const inputSchema = z.object({
  workId: z.string().uuid(),
  deferredCount: z.number().int().min(0).max(10000),
  firstDeferredAt: z.string().datetime().nullable(),
  deferSeconds: z.number().int().min(30).max(86400).default(900),
  missingIndicators: z.array(
    z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_]*$/),
  ).max(100).default([]),
});

export type CommercialPostActivationDueWorkDeferralDecision =
  | {
      ok: false;
      error: "invalid_input" | "invalid_deferral_history" | "invalid_policy";
      message: string;
    }
  | {
      ok: true;
      workId: string;
      action: "defer";
      reason: null;
      deferredCount: number;
      firstDeferredAt: string;
      nextAvailableAt: string;
      escalationRequired: false;
      missingIndicators: string[];
    }
  | {
      ok: true;
      workId: string;
      action: "escalate";
      reason: "deferral_limit_reached" | "wait_deadline_reached";
      deferredCount: number;
      firstDeferredAt: string;
      nextAvailableAt: null;
      escalationRequired: true;
      missingIndicators: string[];
    };

export function decideCommercialPostActivationDueWorkDeferral(
  rawInput: unknown,
  options: {
    now?: () => Date;
    maxDeferrals?: number;
    maxWaitSeconds?: number;
  } = {},
): CommercialPostActivationDueWorkDeferralDecision {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure("invalid_input", "Dados para adiamento do trabalho pós-ativação inválidos.");
  }

  const maxDeferrals = options.maxDeferrals ?? COMMERCIAL_POST_ACTIVATION_MAX_DEFERRALS;
  const maxWaitSeconds = options.maxWaitSeconds ?? COMMERCIAL_POST_ACTIVATION_MAX_WAIT_SECONDS;
  if (
    !Number.isInteger(maxDeferrals) || maxDeferrals < 1 || maxDeferrals > 10000
    || !Number.isInteger(maxWaitSeconds) || maxWaitSeconds < 30 || maxWaitSeconds > 2592000
  ) {
    return failure("invalid_policy", "Política de adiamento do trabalho pós-ativação inválida.");
  }

  const input = parsed.data;
  if (
    (input.deferredCount === 0 && input.firstDeferredAt !== null)
    || (input.deferredCount > 0 && input.firstDeferredAt === null)
  ) {
    return failure(
      "invalid_deferral_history",
      "O histórico de adiamentos do trabalho pós-ativação é inconsistente.",
    );
  }

  const now = options.now?.() ?? new Date();
  const firstDeferredAt = input.firstDeferredAt
    ? new Date(input.firstDeferredAt)
    : now;
  if (firstDeferredAt.getTime() > now.getTime()) {
    return failure(
      "invalid_deferral_history",
      "O primeiro adiamento não pode ocorrer no futuro.",
    );
  }

  const missingIndicators = [...new Set(input.missingIndicators)].sort();
  const deadlineAt = new Date(firstDeferredAt.getTime() + maxWaitSeconds * 1000);
  if (now.getTime() >= deadlineAt.getTime()) {
    return escalation(input, firstDeferredAt, missingIndicators, "wait_deadline_reached");
  }
  if (input.deferredCount >= maxDeferrals) {
    return escalation(input, firstDeferredAt, missingIndicators, "deferral_limit_reached");
  }

  const nextAvailableAt = new Date(Math.min(
    now.getTime() + input.deferSeconds * 1000,
    deadlineAt.getTime(),
  ));
  return {
    ok: true,
    workId: input.workId,
    action: "defer",
    reason: null,
    deferredCount: input.deferredCount + 1,
    firstDeferredAt: firstDeferredAt.toISOString(),
    nextAvailableAt: nextAvailableAt.toISOString(),
    escalationRequired: false,
    missingIndicators,
  };
}

function escalation(
  input: z.output<typeof inputSchema>,
  firstDeferredAt: Date,
  missingIndicators: string[],
  reason: "deferral_limit_reached" | "wait_deadline_reached",
): CommercialPostActivationDueWorkDeferralDecision {
  return {
    ok: true,
    workId: input.workId,
    action: "escalate",
    reason,
    deferredCount: input.deferredCount,
    firstDeferredAt: firstDeferredAt.toISOString(),
    nextAvailableAt: null,
    escalationRequired: true,
    missingIndicators,
  };
}

function failure(
  error: "invalid_input" | "invalid_deferral_history" | "invalid_policy",
  message: string,
): CommercialPostActivationDueWorkDeferralDecision {
  return { ok: false, error, message };
}
