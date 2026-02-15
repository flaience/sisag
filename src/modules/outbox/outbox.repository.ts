// src/modules/outbox/outbox.repository.ts
import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";

// 🔒 CONTRATO CONGELADO
import type { OutboxEventType } from "@/domain/events/outbox-contracts";

type DbLike = { insert: (...args: any[]) => any };

export type OutboxRow = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  status: string;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  dedupeKey: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type OutboxInsertParams<TPayload = any> = {
  aggregateType: string;
  aggregateId: string;
  eventType: OutboxEventType;
  payload: TPayload;
};

// ✅ mantém
export async function outboxInsert<TPayload = any>(
  event: OutboxInsertParams<TPayload>,
  dbOrTx?: DbLike,
) {
  const db = dbOrTx ?? (getDb() as any);

  await db.insert(outbox).values({
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    eventType: event.eventType,
    payload: event.payload,
    status: "pending",
  });
}

/**
 * Claim batch com lock seguro.
 * Estratégia:
 * - seleciona itens elegíveis (pending ou failed com nextRetryAt <= now)
 * - trava por lockedAt/lockedBy
 * - usa FOR UPDATE SKIP LOCKED para rodar multi-worker sem briga
 */
export async function outboxClaimBatch(params: {
  workerId: string;
  limit: number;
  now?: Date;
}) {
  const db = getDb();
  const now = params.now ?? new Date();

  // OBS: usando SQL raw para garantir "FOR UPDATE SKIP LOCKED"
  // (Drizzle ainda limita esse padrão dependendo do driver)
  const rows = await db.execute(sql`
    WITH candidates AS (
      SELECT id
      FROM outbox
      WHERE
        (
          status = 'pending'
          OR (status = 'failed' AND (next_retry_at IS NULL OR next_retry_at <= ${now}))
        )
        AND (locked_at IS NULL OR locked_at < ${sql`${now} - interval '5 minutes'`})
      ORDER BY created_at ASC
      LIMIT ${params.limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox o
    SET
      status = 'processing',
      locked_at = ${now},
      locked_by = ${params.workerId},
      updated_at = ${now}
    FROM candidates c
    WHERE o.id = c.id
    RETURNING
      o.id,
      o.aggregate_type as "aggregateType",
      o.aggregate_id as "aggregateId",
      o.event_type as "eventType",
      o.payload,
      o.status,
      o.attempts,
      o.last_error as "lastError",
      o.next_retry_at as "nextRetryAt",
      o.locked_at as "lockedAt",
      o.locked_by as "lockedBy",
      o.dedupe_key as "dedupeKey",
      o.created_at as "createdAt",
      o.updated_at as "updatedAt";
  `);

  // db.execute retorna { rows } no node-postgres; normalize:
  const resultRows = (rows as any).rows ?? rows ?? [];
  return resultRows as OutboxRow[];
}

export async function outboxMarkDone(params: {
  id: string;
  workerId: string;
  now?: Date;
}) {
  const db = getDb();
  const now = params.now ?? new Date();

  await db.execute(sql`
    UPDATE outbox
    SET
      status = 'done',
      locked_at = NULL,
      locked_by = NULL,
      last_error = NULL,
      updated_at = ${now}
    WHERE id = ${params.id} AND locked_by = ${params.workerId};
  `);
}

export async function outboxMarkFailed(params: {
  id: string;
  workerId: string;
  errorMessage: string;
  nextRetryAt: Date | null;
  now?: Date;
}) {
  const db = getDb();
  const now = params.now ?? new Date();

  await db.execute(sql`
    UPDATE outbox
    SET
      status = 'failed',
      attempts = attempts + 1,
      last_error = ${params.errorMessage},
      next_retry_at = ${params.nextRetryAt},
      locked_at = NULL,
      locked_by = NULL,
      updated_at = ${now}
    WHERE id = ${params.id} AND locked_by = ${params.workerId};
  `);
}

/** Se quiser "soltar" manualmente */
export async function outboxReleaseLock(params: {
  id: string;
  workerId: string;
  now?: Date;
}) {
  const db = getDb();
  const now = params.now ?? new Date();

  await db.execute(sql`
    UPDATE outbox
    SET locked_at = NULL, locked_by = NULL, status = 'pending', updated_at = ${now}
    WHERE id = ${params.id} AND locked_by = ${params.workerId};
  `);
}
