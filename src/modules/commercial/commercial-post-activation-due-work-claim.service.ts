import { and, asc, eq, inArray, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS = 5;

const inputSchema = z.object({
  workerKey: z.string().trim().min(1).max(200)
    .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
  limit: z.number().int().positive().max(100).default(25),
  lockSeconds: z.number().int().min(30).max(1800).default(300),
});

const claimedItemSchema = z.object({
  id: z.string().uuid(),
  onboardingId: z.string().uuid(),
  milestoneCode: z.string().trim().min(1).max(100),
  status: z.literal("processing"),
  dueAt: z.string().datetime(),
  availableAt: z.string().datetime(),
  priority: z.number().int().min(0).max(1000),
  attempts: z.number().int().positive(),
  lockedUntil: z.string().datetime(),
  lockedBy: z.string().min(1).max(200),
});

export type CommercialPostActivationClaimedWorkItem = z.output<
  typeof claimedItemSchema
>;

type ClaimStore = {
  claim(input: {
    workerKey: string;
    limit: number;
    now: Date;
    lockedUntil: Date;
  }): Promise<unknown[]>;
};

export type ClaimCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_claimed_work";
      message: string;
    }
  | {
      ok: true;
      workerKey: string;
      claimed: number;
      lockedUntil: string;
      items: CommercialPostActivationClaimedWorkItem[];
    };

export async function claimCommercialPostActivationDueWork(
  rawInput: unknown,
  options: {
    store?: ClaimStore;
    now?: () => Date;
  } = {},
): Promise<ClaimCommercialPostActivationDueWorkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para reivindicação dos trabalhos pós-ativação inválidos.",
    };
  }

  const now = options.now?.() ?? new Date();
  const lockedUntil = new Date(
    now.getTime() + parsed.data.lockSeconds * 1000,
  );
  const store = options.store ?? createDrizzleClaimStore();
  const storedItems = await store.claim({
    workerKey: parsed.data.workerKey,
    limit: parsed.data.limit,
    now,
    lockedUntil,
  });
  const claimed = z.array(claimedItemSchema)
    .max(parsed.data.limit)
    .safeParse(storedItems);
  if (!claimed.success || claimed.data.some((item) => (
    item.lockedBy !== parsed.data.workerKey
    || item.lockedUntil !== lockedUntil.toISOString()
  ))) {
    return {
      ok: false,
      error: "invalid_claimed_work",
      message: "Os trabalhos reivindicados estão inconsistentes.",
    };
  }

  return {
    ok: true,
    workerKey: parsed.data.workerKey,
    claimed: claimed.data.length,
    lockedUntil: lockedUntil.toISOString(),
    items: claimed.data.map((item) => ({
      id: item.id,
      onboardingId: item.onboardingId,
      milestoneCode: item.milestoneCode,
      status: item.status,
      dueAt: item.dueAt,
      availableAt: item.availableAt,
      priority: item.priority,
      attempts: item.attempts,
      lockedUntil: item.lockedUntil,
      lockedBy: item.lockedBy,
    })),
  };
}

function createDrizzleClaimStore(): ClaimStore {
  const db = getDb();
  return {
    claim(input) {
      return db.transaction(async (tx) => {
        const selected = await tx.select({
          id: commercialPostActivationDueWorkItems.id,
        }).from(commercialPostActivationDueWorkItems)
          .where(and(
            inArray(
              commercialPostActivationDueWorkItems.status,
              ["scheduled", "failed"],
            ),
            lte(commercialPostActivationDueWorkItems.availableAt, input.now),
            lt(
              commercialPostActivationDueWorkItems.attempts,
              COMMERCIAL_POST_ACTIVATION_DUE_WORK_MAX_ATTEMPTS,
            ),
            eq(commercialPostActivationDueWorkItems.escalationRequired, false),
          ))
          .orderBy(
            asc(commercialPostActivationDueWorkItems.availableAt),
            asc(commercialPostActivationDueWorkItems.dueAt),
            asc(commercialPostActivationDueWorkItems.priority),
            asc(commercialPostActivationDueWorkItems.id),
          )
          .limit(input.limit)
          .for("update", { skipLocked: true });
        const ids = selected.map((item) => item.id);
        if (ids.length === 0) return [];

        const rows = await tx.update(commercialPostActivationDueWorkItems)
          .set({
            status: "processing",
            attempts: sql`${commercialPostActivationDueWorkItems.attempts} + 1`,
            lockedUntil: input.lockedUntil,
            lockedBy: input.workerKey,
            updatedAt: input.now,
          })
          .where(inArray(commercialPostActivationDueWorkItems.id, ids))
          .returning({
            id: commercialPostActivationDueWorkItems.id,
            onboardingId: commercialPostActivationDueWorkItems.onboardingId,
            milestoneCode: commercialPostActivationDueWorkItems.milestoneCode,
            status: commercialPostActivationDueWorkItems.status,
            dueAt: commercialPostActivationDueWorkItems.dueAt,
            availableAt: commercialPostActivationDueWorkItems.availableAt,
            priority: commercialPostActivationDueWorkItems.priority,
            attempts: commercialPostActivationDueWorkItems.attempts,
            lockedUntil: commercialPostActivationDueWorkItems.lockedUntil,
            lockedBy: commercialPostActivationDueWorkItems.lockedBy,
          });
        return rows.map((row) => ({
          id: row.id,
          onboardingId: row.onboardingId,
          milestoneCode: row.milestoneCode,
          status: row.status,
          dueAt: row.dueAt.toISOString(),
          availableAt: row.availableAt.toISOString(),
          priority: row.priority,
          attempts: row.attempts,
          lockedUntil: row.lockedUntil?.toISOString(),
          lockedBy: row.lockedBy,
        })).sort((left, right) => (
          left.availableAt.localeCompare(right.availableAt)
          || left.dueAt.localeCompare(right.dueAt)
          || left.priority - right.priority
          || left.id.localeCompare(right.id)
        ));
      });
    },
  };
}
