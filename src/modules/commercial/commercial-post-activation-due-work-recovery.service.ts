import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS } from "./commercial-post-activation-due-work-claim.service";

const inputSchema = z.object({
  limit: z.number().int().positive().max(100).default(25),
});

const expiredWorkSchema = z.object({
  id: z.string().uuid(),
  attempts: z.number().int().positive(),
});

type RecoveryChanges = {
  status: "failed";
  availableAt?: Date;
  lockedUntil: null;
  lockedBy: null;
  lastError: "processing_lock_expired";
  completedAt: null;
  updatedAt: Date;
};

type RecoveryStore = {
  transaction<T>(callback: (tx: {
    listExpired(limit: number, now: Date): Promise<unknown[]>;
    update(workId: string, changes: RecoveryChanges): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

export type RecoverCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_expired_work";
      message: string;
    }
  | {
      ok: true;
      recovered: number;
      retryable: number;
      exhausted: number;
      items: Array<{
        workId: string;
        attempts: number;
        retryable: boolean;
        nextRetryAt: string | null;
      }>;
    };

export async function recoverCommercialPostActivationDueWork(
  rawInput: unknown = {},
  options: {
    store?: RecoveryStore;
    now?: () => Date;
    maxAttempts?: number;
    baseBackoffSeconds?: number;
    maxBackoffSeconds?: number;
  } = {},
): Promise<RecoverCommercialPostActivationDueWorkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  const maxAttempts = options.maxAttempts
    ?? COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS;
  const baseBackoffSeconds = options.baseBackoffSeconds ?? 60;
  const maxBackoffSeconds = options.maxBackoffSeconds ?? 3600;
  if (
    !parsed.success
    || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100
    || !Number.isInteger(baseBackoffSeconds)
    || baseBackoffSeconds < 1 || baseBackoffSeconds > 86400
    || !Number.isInteger(maxBackoffSeconds)
    || maxBackoffSeconds < baseBackoffSeconds
    || maxBackoffSeconds > 86400
  ) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para recuperação dos trabalhos pós-ativação inválidos.",
    };
  }

  const now = options.now?.() ?? new Date();
  const store = options.store ?? createDrizzleRecoveryStore();
  return store.transaction(async (tx) => {
    const expired = z.array(expiredWorkSchema)
      .max(parsed.data.limit)
      .safeParse(await tx.listExpired(parsed.data.limit, now));
    if (!expired.success) {
      return {
        ok: false,
        error: "invalid_expired_work",
        message: "Os trabalhos expirados encontrados estão inconsistentes.",
      };
    }

    const result = {
      ok: true as const,
      recovered: expired.data.length,
      retryable: 0,
      exhausted: 0,
      items: [] as Array<{
        workId: string;
        attempts: number;
        retryable: boolean;
        nextRetryAt: string | null;
      }>,
    };
    for (const work of expired.data) {
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
        lastError: "processing_lock_expired",
        completedAt: null,
        updatedAt: now,
      });
      if (retryable) result.retryable += 1;
      else result.exhausted += 1;
      result.items.push({
        workId: work.id,
        attempts: work.attempts,
        retryable,
        nextRetryAt: nextRetryAt?.toISOString() ?? null,
      });
    }
    return result;
  });
}

function createDrizzleRecoveryStore(): RecoveryStore {
  const db = getDb();
  return {
    transaction(callback) {
      return db.transaction(async (tx) => callback({
        async listExpired(limit, now) {
          return tx.select({
            id: commercialPostActivationDueWorkItems.id,
            attempts: commercialPostActivationDueWorkItems.attempts,
          }).from(commercialPostActivationDueWorkItems)
            .where(and(
              eq(commercialPostActivationDueWorkItems.status, "processing"),
              lte(commercialPostActivationDueWorkItems.lockedUntil, now),
            ))
            .orderBy(
              asc(commercialPostActivationDueWorkItems.lockedUntil),
              asc(commercialPostActivationDueWorkItems.id),
            )
            .limit(limit)
            .for("update", { skipLocked: true });
        },
        async update(workId, changes) {
          await tx.update(commercialPostActivationDueWorkItems)
            .set(changes)
            .where(inArray(commercialPostActivationDueWorkItems.id, [workId]));
        },
      }));
    },
  };
}
