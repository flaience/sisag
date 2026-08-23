import { eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const snapshotSchema = z.object({
  total: z.number().int().nonnegative(),
  scheduled: z.number().int().nonnegative(),
  processing: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  claimable: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  expiredLocks: z.number().int().nonnegative(),
  totalAttempts: z.number().int().nonnegative(),
  oldestOutstandingAt: z.string().datetime().nullable(),
});

type StoredSnapshot = z.input<typeof snapshotSchema>;

type DueWorkQueryStore = {
  readSnapshot(now: Date): Promise<StoredSnapshot>;
};

export type CommercialPostActivationDueWorkStatus =
  | "healthy"
  | "degraded"
  | "critical";

export type CommercialPostActivationDueWorkReason =
  | "overdue_work"
  | "failed_work"
  | "expired_processing_locks";

export type GetCommercialPostActivationDueWorkSnapshotResult =
  | {
      ok: false;
      error: "invalid_snapshot";
      message: string;
    }
  | {
      ok: true;
      data: {
        recordedAt: string;
        status: CommercialPostActivationDueWorkStatus;
        reasons: CommercialPostActivationDueWorkReason[];
        total: number;
        scheduled: number;
        processing: number;
        completed: number;
        failed: number;
        claimable: number;
        overdue: number;
        expiredLocks: number;
        totalAttempts: number;
        oldestOutstandingAt: string | null;
        oldestOutstandingAgeSeconds: number | null;
      };
    };

export async function getCommercialPostActivationDueWorkSnapshot(
  options: {
    store?: DueWorkQueryStore;
    now?: () => Date;
  } = {},
): Promise<GetCommercialPostActivationDueWorkSnapshotResult> {
  const now = options.now?.() ?? new Date();
  const store = options.store ?? createDrizzleDueWorkQueryStore();
  const parsed = snapshotSchema.safeParse(await store.readSnapshot(now));
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_snapshot",
      message: "Os indicadores da fila pós-ativação são inválidos.",
    };
  }

  const snapshot = parsed.data;
  if (
    snapshot.scheduled
      + snapshot.processing
      + snapshot.completed
      + snapshot.failed
    !== snapshot.total
    || snapshot.claimable > snapshot.scheduled + snapshot.failed
    || snapshot.overdue > snapshot.scheduled + snapshot.failed
    || snapshot.expiredLocks > snapshot.processing
  ) {
    return {
      ok: false,
      error: "invalid_snapshot",
      message: "Os indicadores da fila pós-ativação são inconsistentes.",
    };
  }

  const reasons: CommercialPostActivationDueWorkReason[] = [];
  if (snapshot.overdue > 0) reasons.push("overdue_work");
  if (snapshot.failed > 0) reasons.push("failed_work");
  if (snapshot.expiredLocks > 0) reasons.push("expired_processing_locks");
  const status: CommercialPostActivationDueWorkStatus = snapshot.expiredLocks > 0
    ? "critical"
    : reasons.length > 0
      ? "degraded"
      : "healthy";
  const oldestOutstandingAgeSeconds = snapshot.oldestOutstandingAt === null
    ? null
    : Math.max(0, Math.floor(
      (now.getTime() - new Date(snapshot.oldestOutstandingAt).getTime()) / 1000,
    ));

  return {
    ok: true,
    data: {
      recordedAt: now.toISOString(),
      status,
      reasons,
      total: snapshot.total,
      scheduled: snapshot.scheduled,
      processing: snapshot.processing,
      completed: snapshot.completed,
      failed: snapshot.failed,
      claimable: snapshot.claimable,
      overdue: snapshot.overdue,
      expiredLocks: snapshot.expiredLocks,
      totalAttempts: snapshot.totalAttempts,
      oldestOutstandingAt: snapshot.oldestOutstandingAt,
      oldestOutstandingAgeSeconds,
    },
  };
}

function createDrizzleDueWorkQueryStore(): DueWorkQueryStore {
  return {
    async readSnapshot(now) {
      const status = commercialPostActivationDueWorkItems.status;
      const dueAt = commercialPostActivationDueWorkItems.dueAt;
      const availableAt = commercialPostActivationDueWorkItems.availableAt;
      const lockedUntil = commercialPostActivationDueWorkItems.lockedUntil;
      const db = getDb();
      const operationalRows = await db.select({
        total: sql<number>`count(*)::int`,
        scheduled: sql<number>`count(*) filter (where ${status} = 'scheduled')::int`,
        processing: sql<number>`count(*) filter (where ${status} = 'processing')::int`,
        failed: sql<number>`count(*) filter (where ${status} = 'failed')::int`,
        claimable: sql<number>`count(*) filter (where ${status} in ('scheduled', 'failed') and ${availableAt} <= ${now})::int`,
        overdue: sql<number>`count(*) filter (where ${status} in ('scheduled', 'failed') and ${dueAt} <= ${now})::int`,
        expiredLocks: sql<number>`count(*) filter (where ${status} = 'processing' and ${lockedUntil} <= ${now})::int`,
        totalAttempts: sql<number>`coalesce(sum(${commercialPostActivationDueWorkItems.attempts}), 0)::int`,
        oldestOutstandingAt: sql<Date | null>`min(${dueAt})`,
      }).from(commercialPostActivationDueWorkItems)
        .where(ne(status, "completed"));
      const completedRows = await db.select({
        completed: sql<number>`count(*)::int`,
      }).from(commercialPostActivationDueWorkItems)
        .where(eq(status, "completed"));
      const row = operationalRows[0];
      const completed = Number(completedRows[0]?.completed ?? 0);
      const outstanding = Number(row?.total ?? 0);
      return {
        total: outstanding + completed,
        scheduled: Number(row?.scheduled ?? 0),
        processing: Number(row?.processing ?? 0),
        completed,
        failed: Number(row?.failed ?? 0),
        claimable: Number(row?.claimable ?? 0),
        overdue: Number(row?.overdue ?? 0),
        expiredLocks: Number(row?.expiredLocks ?? 0),
        totalAttempts: Number(row?.totalAttempts ?? 0),
        oldestOutstandingAt: row?.oldestOutstandingAt?.toISOString() ?? null,
      };
    },
  };
}
