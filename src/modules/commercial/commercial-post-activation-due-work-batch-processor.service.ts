import { z } from "zod";

import { claimCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-claim.service";
import { settleCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-settlement.service";
import { executeCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-unit-executor.service";

const inputSchema = z.object({
  workerKey: z.string().trim().min(1).max(200)
    .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
  limit: z.number().int().positive().max(100).default(25),
  concurrency: z.number().int().positive().max(20).default(5),
  lockSeconds: z.number().int().min(30).max(1800).default(300),
  deferSeconds: z.number().int().min(30).max(86400).default(900),
});

type Claimer = typeof claimCommercialPostActivationDueWork;
type Executor = typeof executeCommercialPostActivationDueWork;
type Settler = typeof settleCommercialPostActivationDueWork;

type BatchItemResult = {
  workId: string;
  onboardingId: string;
  milestoneCode: string;
  outcome: "completed" | "deferred" | "escalated" | "failed" | "settlement_failed";
  decision: "wait" | "completed" | "human_escalation" | "plan_completed" | null;
  retryable: boolean;
  nextAvailableAt: string | null;
  error: string | null;
};

export type ProcessCommercialPostActivationDueWorkBatchResult =
  | {
      ok: false;
      error: "invalid_input" | "claim_failed";
      message: string;
    }
  | {
      ok: true;
      workerKey: string;
      claimed: number;
      completed: number;
      deferred: number;
      escalated: number;
      failed: number;
      settlementFailed: number;
      items: BatchItemResult[];
    };

export async function processCommercialPostActivationDueWorkBatch(
  rawInput: unknown,
  options: {
    claim?: Claimer;
    execute?: Executor;
    settle?: Settler;
  } = {},
): Promise<ProcessCommercialPostActivationDueWorkBatchResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para processamento do lote pós-ativação inválidos.",
    };
  }

  const input = parsed.data;
  const claim = await (options.claim ?? claimCommercialPostActivationDueWork)({
    workerKey: input.workerKey,
    limit: input.limit,
    lockSeconds: input.lockSeconds,
  });
  if (claim.ok === false) {
    return {
      ok: false,
      error: claim.error === "invalid_input" ? "invalid_input" : "claim_failed",
      message: claim.message,
    };
  }

  const results = new Array<BatchItemResult>(claim.items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      const item = claim.items[index];
      if (!item) return;
      if (!item.id || !item.onboardingId || !item.milestoneCode) {
        throw new Error("invalid_claimed_due_work_item");
      }
      results[index] = await processItem({
        id: item.id,
        onboardingId: item.onboardingId,
        milestoneCode: item.milestoneCode,
      }, input, options);
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(input.concurrency, claim.items.length) },
    () => worker(),
  ));

  return {
    ok: true,
    workerKey: claim.workerKey,
    claimed: claim.claimed,
    completed: results.filter((item) => item.outcome === "completed").length,
    deferred: results.filter((item) => item.outcome === "deferred").length,
    escalated: results.filter((item) => item.outcome === "escalated").length,
    failed: results.filter((item) => item.outcome === "failed").length,
    settlementFailed: results.filter((item) => item.outcome === "settlement_failed").length,
    items: results,
  };
}

async function processItem(
  item: {
    id: string;
    onboardingId: string;
    milestoneCode: string;
  },
  input: z.output<typeof inputSchema>,
  options: {
    execute?: Executor;
    settle?: Settler;
  },
): Promise<BatchItemResult> {
  const execute = options.execute ?? executeCommercialPostActivationDueWork;
  const settle = options.settle ?? settleCommercialPostActivationDueWork;
  try {
    const executed = await execute({
      workId: item.id,
      workerKey: input.workerKey,
      onboardingId: item.onboardingId,
      milestoneCode: item.milestoneCode,
    }, { deferSeconds: input.deferSeconds });

    if (executed.ok === false) {
      return settleFailure(item, input.workerKey, `execution_${executed.error}`, settle);
    }

    const settlement = await settle({
      workId: item.id,
      workerKey: input.workerKey,
      outcome: executed.settlementOutcome,
      ...(executed.settlementOutcome === "deferred"
        ? {
            deferSeconds: executed.deferSeconds ?? input.deferSeconds,
            missingIndicators: executed.missingIndicators ?? [],
          }
        : {}),
    });
    if (settlement.ok === false) {
      return settlementFailure(item, `settlement_${settlement.error}`);
    }
    return {
      workId: item.id,
      onboardingId: item.onboardingId,
      milestoneCode: item.milestoneCode,
      outcome: settlement.outcome === "escalated"
        ? "escalated"
        : executed.settlementOutcome,
      decision: executed.decision,
      retryable: settlement.retryable,
      nextAvailableAt: settlement.nextAvailableAt ?? settlement.nextRetryAt,
      error: null,
    };
  } catch (error) {
    try {
      return await settleFailure(item, input.workerKey, "unexpected_execution_error", settle);
    } catch {
      return settlementFailure(item, "unexpected_settlement_error");
    }
  }
}

async function settleFailure(
  item: { id: string; onboardingId: string; milestoneCode: string },
  workerKey: string,
  error: string,
  settle: Settler,
): Promise<BatchItemResult> {
  const settlement = await settle({
    workId: item.id,
    workerKey,
    outcome: "failed",
    error,
  });
  if (settlement.ok === false) {
    return settlementFailure(item, `settlement_${settlement.error}`);
  }
  return {
    workId: item.id,
    onboardingId: item.onboardingId,
    milestoneCode: item.milestoneCode,
    outcome: "failed",
    decision: null,
    retryable: settlement.retryable,
    nextAvailableAt: settlement.nextRetryAt,
    error,
  };
}

function settlementFailure(
  item: { id: string; onboardingId: string; milestoneCode: string },
  error: string,
): BatchItemResult {
  return {
    workId: item.id,
    onboardingId: item.onboardingId,
    milestoneCode: item.milestoneCode,
    outcome: "settlement_failed",
    decision: null,
    retryable: false,
    nextAvailableAt: null,
    error,
  };
}
