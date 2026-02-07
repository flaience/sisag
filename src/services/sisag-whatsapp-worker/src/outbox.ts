import { getPool } from "./db.js";

export type OutboxRow = {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  payload: any;
  attempts: number;
};

export async function fetchPendingOutbox(
  batchSize: number,
): Promise<OutboxRow[]> {
  const pool = getPool();

  // Pega itens pendentes e “trava” eles (processing) numa transação
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      with picked as (
        select id
        from outbox
        where status = 'pending'
          and (next_retry_at is null or next_retry_at <= now())
        order by created_at asc
        limit $1
        for update skip locked
      )
      update outbox o
      set status = 'processing',
          updated_at = now()
      from picked
      where o.id = picked.id
      returning o.id, o.aggregate_id, o.aggregate_type, o.event_type, o.payload, o.attempts;
      `,
      [batchSize],
    );

    await client.query("COMMIT");
    return rows as OutboxRow[];
  } catch (e) {
    await client.query("ROLLBACK");
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
) {
  const pool = getPool();

  await pool.query(
    `
    update outbox
    set status = 'pending',
        attempts = attempts + 1,
        last_error = $2,
        next_retry_at = now() + ($3 || ' seconds')::interval,
        updated_at = now()
    where id = $1;
    `,
    [outboxId, errorMsg.slice(0, 5000), String(nextRetrySeconds)],
  );
}
