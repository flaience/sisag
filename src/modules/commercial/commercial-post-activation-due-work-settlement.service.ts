import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS } from "./commercial-post-activation-due-work-claim.service";

const inputSchema = z.discriminatedUnion("outcome", [
  z.object({
    workId: z.string().uuid(),
    workerKey: z.string().trim().min(1).max(200)
      .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
    outcome: z.literal("completed"),
  }),
  z.object({
    workId: z.string().uuid(),
    workerKey: z.string().trim().min(1).max(200)
      .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
    outcome: z.literal("deferred"),
    deferSeconds: z.number().int().min(30).max(86400).default(900),
  }),
  z.object({
    workId: z.string().uuid(),
    workerKey: z.string().trim().min(1).max(200)
      .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
    outcome: z.literal("failed"),
    error: z.string().trim().min(1).max(2000),
  }),
]);

type StoredWork = {
  id: string;
  status: string;
  attempts: number;
  lockedUntil: string | null;
  lockedBy: string | null;
};

type SettlementChanges = {
  status: "scheduled" | "completed" | "failed";
  availableAt?: Date;
  attempts?: number;
  lockedUntil: null;
  lockedBy: null;
  lastError: string | null;
  completedAt: Date | null;
  updatedAt: Date;
};

type SettlementStore = {
  transaction<T>(callback: (tx: {
    find(workId: string): Promise<StoredWork | null>;
    update(workId: string, changes: SettlementChanges): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

export type SettleCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error:
        | "invalid_input"
        | "work_not_found"
        | "work_not_processing"
        | "claim_not_owned"
        | "claim_expired";
      message: string;
    }
  | {
      ok: true;
      workId: string;
      outcome: "completed" | "deferred" | "failed";
      attempts: number;
      retryable: boolean;
      nextRetryAt: string | null;
      nextAvailableAt?: string;
    };

export async function settleCommercialPostActivationDueWork(
  rawInput: unknown,
  options: {
    store?: SettlementStore;
    now?: () => Date;
    maxAttempts?: number;
    baseBackoffSeconds?: number;
    maxBackoffSeconds?: number;
  } = {},
): Promise<SettleCommercialPostActivationDueWorkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para encerramento do trabalho pós-ativação inválidos.",
    };
  }

  const now = options.now?.() ?? new Date();
  const maxAttempts = options.maxAttempts
    ?? COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS;
  const baseBackoffSeconds = options.baseBackoffSeconds ?? 60;
  const maxBackoffSeconds = options.maxBackoffSeconds ?? 3600;
  if (
    !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100
    || !Number.isInteger(baseBackoffSeconds)
    || baseBackoffSeconds < 1 || baseBackoffSeconds > 86400
    || !Number.isInteger(maxBackoffSeconds)
    || maxBackoffSeconds < baseBackoffSeconds
    || maxBackoffSeconds > 86400
  ) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Política de encerramento do trabalho pós-ativação inválida.",
    };
  }

  const store = options.store ?? createDrizzleSettlementStore();
  return store.transaction(async (tx) => {
    const work = await tx.find(parsed.data.workId);
    if (!work) return failure("work_not_found", "Trabalho pós-ativação não encontrado.");
    if (work.status !== "processing") {
      return failure("work_not_processing", "O trabalho pós-ativação não está em processamento.");
    }
    if (work.lockedBy !== parsed.data.workerKey) {
      return failure("claim_not_owned", "O trabalho pertence a outro processador.");
    }
    if (!work.lockedUntil || new Date(work.lockedUntil).getTime() <= now.getTime()) {
      return failure("claim_expired", "A reivindicação do trabalho pós-ativação expirou.");
    }

    if (parsed.data.outcome === "deferred") {
      const availableAt = new Date(
        now.getTime() + parsed.data.deferSeconds * 1000,
      );
      const attempts = Math.max(0, work.attempts - 1);
      await tx.update(work.id, {
        status: "scheduled",
        availableAt,
        attempts,
        lockedUntil: null,
        lockedBy: null,
        lastError: null,
        completedAt: null,
        updatedAt: now,
      });
      return {
        ok: true,
        workId: work.id,
        outcome: "deferred",
        attempts,
        retryable: false,
        nextRetryAt: null,
        nextAvailableAt: availableAt.toISOString(),
      };
    }

    if (parsed.data.outcome === "completed") {
      await tx.update(work.id, {
        status: "completed",
        lockedUntil: null,
        lockedBy: null,
        lastError: null,
        completedAt: now,
        updatedAt: now,
      });
      return {
        ok: true,
        workId: work.id,
        outcome: "completed",
        attempts: work.attempts,
        retryable: false,
        nextRetryAt: null,
      };
    }

    const retryable = work.attempts < maxAttempts;
    const backoffSeconds = Math.min(
      maxBackoffSeconds,
      baseBackoffSeconds * (2 ** Math.max(0, work.attempts - 1)),
    );
    const nextRetryAt = retryable
      ? new Date(now.getTime() + backoffSeconds * 1000)
      : null;
    await tx.update(work.id, {
      status: "failed",
      ...(nextRetryAt ? { availableAt: nextRetryAt } : {}),
      lockedUntil: null,
      lockedBy: null,
      lastError: parsed.data.error,
      completedAt: null,
      updatedAt: now,
    });
    return {
      ok: true,
      workId: work.id,
      outcome: "failed",
      attempts: work.attempts,
      retryable,
      nextRetryAt: nextRetryAt?.toISOString() ?? null,
    };
  });
}

function failure(
  error: Exclude<SettleCommercialPostActivationDueWorkResult, { ok: true }>["error"],
  message: string,
): SettleCommercialPostActivationDueWorkResult {
  return { ok: false, error, message };
}

function createDrizzleSettlementStore(): SettlementStore {
  const db = getDb();
  return {
    transaction(callback) {
      return db.transaction(async (tx) => callback({
        async find(workId) {
          const rows = await tx.select({
            id: commercialPostActivationDueWorkItems.id,
            status: commercialPostActivationDueWorkItems.status,
            attempts: commercialPostActivationDueWorkItems.attempts,
            lockedUntil: commercialPostActivationDueWorkItems.lockedUntil,
            lockedBy: commercialPostActivationDueWorkItems.lockedBy,
          }).from(commercialPostActivationDueWorkItems)
            .where(eq(commercialPostActivationDueWorkItems.id, workId))
            .limit(1)
            .for("update");
          if (!rows[0]) return null;
          return {
            ...rows[0],
            lockedUntil: rows[0].lockedUntil?.toISOString() ?? null,
          };
        },
        async update(workId, changes) {
          await tx.update(commercialPostActivationDueWorkItems)
            .set(changes)
            .where(eq(commercialPostActivationDueWorkItems.id, workId));
        },
      }));
    },
  };
}
