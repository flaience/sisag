//src/services/sisag-whatsapp-worker/src/outbox.ts
import os from "os";
import { getPool } from "./db.js";

export type OutboxRow = {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  payload: any;
  attempts: number;
  locked_at?: string | null;
  locked_by?: string | null;
};

function env(name: string, def: string) {
  return process.env[name] ?? def;
}

function makeLockedBy() {
  const host = process.env.HOSTNAME || os.hostname() || "unknown";
  return `sisag_whatsapp-worker@${host}`;
}

/**
 * Busca itens elegíveis e marca como processing + lock.
 * Re-claim de processing travado via TTL.
 */
export async function fetchPendingOutbox(
  batchSize: number,
  opts?: {
    lockedBy?: string;
    lockTtlSeconds?: number;
  },
): Promise<OutboxRow[]> {
  const pool = getPool();
  const lockedBy = opts?.lockedBy ?? env("WORKER_LOCKED_BY", makeLockedBy());
  const lockTtlSeconds =
    opts?.lockTtlSeconds ?? Number(env("WORKER_LOCK_TTL_SECONDS", "300")); // 5min

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      with picked as (
        select id
        from outbox
        where
          (
            status = 'pending'
            or (
              status = 'processing'
              and locked_at is not null
              and locked_at < now() - ($2 || ' seconds')::interval
            )
          )
          and (next_retry_at is null or next_retry_at <= now())
        order by created_at asc
        limit $1
      )
      update outbox o
      set status = 'processing',
          locked_at = now(),
          locked_by = $3,
          updated_at = now()
      from picked
      where o.id = picked.id
      returning
        o.id, o.aggregate_id, o.aggregate_type, o.event_type, o.payload, o.attempts,
        o.locked_at, o.locked_by;
      `,
      [batchSize, String(lockTtlSeconds), lockedBy],
    );

    await client.query("COMMIT");
    return rows as OutboxRow[];
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function markOutboxSent(outboxId: string) {
  const pool = getPool();
  await pool.query(
    `
    update outbox
    set status = 'sent',
        locked_at = null,
        locked_by = null,
        last_error = null,
        next_retry_at = null,
        updated_at = now()
    where id = $1;
    `,
    [outboxId],
  );
}

export async function markOutboxFailed(
  outboxId: string,
  errorMsg: string,
  nextRetrySeconds: number,
  opts?: { maxAttempts?: number },
) {
  const pool = getPool();
  const maxAttempts =
    opts?.maxAttempts ?? Number(env("OUTBOX_MAX_ATTEMPTS", "8"));

  // Atualiza attempts + decide status final
  await pool.query(
    `
    update outbox
    set
      attempts = attempts + 1,
      status = case when attempts + 1 >= $4 then 'failed' else 'pending' end,
      last_error = $2,
      next_retry_at = case
        when attempts + 1 >= $4 then null
        else now() + ($3 || ' seconds')::interval
      end,
      locked_at = null,
      locked_by = null,
      updated_at = now()
    where id = $1;
    `,
    [outboxId, errorMsg.slice(0, 5000), String(nextRetrySeconds), maxAttempts],
  );
}
