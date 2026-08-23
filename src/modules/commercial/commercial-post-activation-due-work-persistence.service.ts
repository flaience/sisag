import { asc, eq } from "drizzle-orm";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  projectCommercialPostActivationDueWork,
  type CommercialPostActivationDueWorkProjectionItem,
} from "./commercial-post-activation-due-work-projection.service";

type StoredWorkItem = {
  id: string;
  milestoneCode: string;
  status: "scheduled" | "processing" | "completed" | "failed";
  dueAt: string;
  availableAt: string;
  priority: number;
  attempts: number;
  lockedUntil: string | null;
  lockedBy: string | null;
  lastError: string | null;
  completedAt: string | null;
};

type WorkItemChanges = {
  status?: "scheduled" | "completed";
  dueAt?: string;
  availableAt?: string;
  priority?: number;
  lockedUntil?: null;
  lockedBy?: null;
  lastError?: null;
  completedAt?: string;
  updatedAt: Date;
};

type DueWorkPersistenceStore = {
  transaction<T>(callback: (tx: {
    list(onboardingId: string): Promise<StoredWorkItem[]>;
    insert(item: CommercialPostActivationDueWorkProjectionItem): Promise<boolean>;
    update(id: string, changes: WorkItemChanges): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

type DueWorkProjector = typeof projectCommercialPostActivationDueWork;

export type SynchronizeCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_plan_state";
      message: string;
    }
  | {
      ok: true;
      onboardingId: string;
      total: number;
      created: number;
      updated: number;
      preserved: number;
      completed: number;
    };

export async function synchronizeCommercialPostActivationDueWork(
  rawInput: unknown,
  options: {
    store?: DueWorkPersistenceStore;
    project?: DueWorkProjector;
    now?: () => Date;
  } = {},
): Promise<SynchronizeCommercialPostActivationDueWorkResult> {
  const projected = (options.project
    ?? projectCommercialPostActivationDueWork)(rawInput);
  if (projected.ok === false) return projected;

  const store = options.store ?? createDrizzleDueWorkPersistenceStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const existing = new Map(
      (await tx.list(projected.onboardingId))
        .map((item) => [item.milestoneCode, item]),
    );
    const summary = {
      ok: true as const,
      onboardingId: projected.onboardingId,
      total: projected.items.length,
      created: 0,
      updated: 0,
      preserved: 0,
      completed: 0,
    };

    for (const desired of projected.items) {
      const current = existing.get(desired.milestoneCode);
      if (!current) {
        const inserted = await tx.insert(desired);
        if (inserted) {
          summary.created += 1;
          if (desired.status === "completed") summary.completed += 1;
        } else {
          summary.preserved += 1;
        }
        continue;
      }

      if (desired.status === "completed") {
        if (current.status === "completed") {
          summary.preserved += 1;
          summary.completed += 1;
          continue;
        }
        await tx.update(current.id, {
          status: "completed",
          dueAt: desired.dueAt,
          priority: desired.priority,
          lockedUntil: null,
          lockedBy: null,
          lastError: null,
          completedAt: desired.completedAt!,
          updatedAt: now,
        });
        summary.updated += 1;
        summary.completed += 1;
        continue;
      }

      if (current.status !== "scheduled") {
        summary.preserved += 1;
        if (current.status === "completed") summary.completed += 1;
        continue;
      }

      if (
        current.dueAt === desired.dueAt
        && current.availableAt === desired.availableAt
        && current.priority === desired.priority
      ) {
        summary.preserved += 1;
        continue;
      }

      await tx.update(current.id, {
        dueAt: desired.dueAt,
        availableAt: desired.availableAt,
        priority: desired.priority,
        updatedAt: now,
      });
      summary.updated += 1;
    }

    return summary;
  });
}

function createDrizzleDueWorkPersistenceStore(): DueWorkPersistenceStore {
  const db = getDb();
  return {
    transaction(callback) {
      return db.transaction(async (databaseTx) => callback({
        async list(onboardingId) {
          const rows = await databaseTx.select({
            id: commercialPostActivationDueWorkItems.id,
            milestoneCode: commercialPostActivationDueWorkItems.milestoneCode,
            status: commercialPostActivationDueWorkItems.status,
            dueAt: commercialPostActivationDueWorkItems.dueAt,
            availableAt: commercialPostActivationDueWorkItems.availableAt,
            priority: commercialPostActivationDueWorkItems.priority,
            attempts: commercialPostActivationDueWorkItems.attempts,
            lockedUntil: commercialPostActivationDueWorkItems.lockedUntil,
            lockedBy: commercialPostActivationDueWorkItems.lockedBy,
            lastError: commercialPostActivationDueWorkItems.lastError,
            completedAt: commercialPostActivationDueWorkItems.completedAt,
          }).from(commercialPostActivationDueWorkItems)
            .where(eq(
              commercialPostActivationDueWorkItems.onboardingId,
              onboardingId,
            ))
            .orderBy(asc(commercialPostActivationDueWorkItems.dueAt))
            .for("update");
          return rows.map((row) => ({
            ...row,
            status: row.status as StoredWorkItem["status"],
            dueAt: row.dueAt.toISOString(),
            availableAt: row.availableAt.toISOString(),
            lockedUntil: row.lockedUntil?.toISOString() ?? null,
            completedAt: row.completedAt?.toISOString() ?? null,
          }));
        },
        async insert(item) {
          const rows = await databaseTx
            .insert(commercialPostActivationDueWorkItems)
            .values({
              onboardingId: item.onboardingId,
              milestoneCode: item.milestoneCode,
              status: item.status,
              dueAt: new Date(item.dueAt),
              availableAt: new Date(item.availableAt),
              priority: item.priority,
              completedAt: item.completedAt
                ? new Date(item.completedAt)
                : null,
            })
            .onConflictDoNothing()
            .returning({ id: commercialPostActivationDueWorkItems.id });
          return Boolean(rows[0]);
        },
        async update(id, changes) {
          await databaseTx.update(commercialPostActivationDueWorkItems).set({
            ...(changes.status === undefined ? {} : { status: changes.status }),
            ...(changes.dueAt === undefined
              ? {}
              : { dueAt: new Date(changes.dueAt) }),
            ...(changes.availableAt === undefined
              ? {}
              : { availableAt: new Date(changes.availableAt) }),
            ...(changes.priority === undefined
              ? {}
              : { priority: changes.priority }),
            ...(changes.lockedUntil === undefined
              ? {}
              : { lockedUntil: changes.lockedUntil }),
            ...(changes.lockedBy === undefined
              ? {}
              : { lockedBy: changes.lockedBy }),
            ...(changes.lastError === undefined
              ? {}
              : { lastError: changes.lastError }),
            ...(changes.completedAt === undefined
              ? {}
              : { completedAt: new Date(changes.completedAt) }),
            updatedAt: changes.updatedAt,
          }).where(eq(commercialPostActivationDueWorkItems.id, id));
        },
      }));
    },
  };
}
