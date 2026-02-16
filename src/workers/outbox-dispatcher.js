/* src/workers/outbox-dispatcher.cjs */

/**
 * Outbox Dispatcher (standalone)
 * - Lê outbox do Postgres
 * - Dispara para N8N_WEBHOOK_URL com header "x-webhook-secret"
 * - Marca done / failed + retry com backoff simples
 *
 * ENV:
 *  DATABASE_URL or DATABASE_URL_FILE
 *  N8N_WEBHOOK_URL
 *  N8N_WEBHOOK_SECRET
 *  DISPATCH_BATCH_SIZE (default 10)
 *  DISPATCH_INTERVAL_MS (default 2000)
 *  N8N_TIMEOUT_MS (default 8000)
 *  WORKER_ID (default "outbox-dispatcher-1")
 *  OUTBOX_MAX_ATTEMPTS (default 8)
 */

const fs = require("fs");
const { Pool } = require("pg");

function env(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function readSecretFile(path) {
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function getDatabaseUrl() {
  const file = env("DATABASE_URL_FILE");
  if (file) {
    const v = readSecretFile(file);
    if (v) return v;
  }
  const direct = env("DATABASE_URL");
  if (direct) return direct;
  throw new Error("DB config missing: set DATABASE_URL or DATABASE_URL_FILE");
}

async function postJson(url, body, headers) {
  const controller = new AbortController();
  const timeoutMs = Number(env("N8N_TIMEOUT_MS", "8000"));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

function nextRetrySeconds(attempts) {
  // backoff leve: 5, 10, 20, 40, 60...
  const base = 5 * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(60, Math.floor(base));
}

async function main() {
  const databaseUrl = getDatabaseUrl();
  const n8nUrl = env("N8N_WEBHOOK_URL");
  const secret = env("N8N_WEBHOOK_SECRET");

  if (!n8nUrl) throw new Error("Missing N8N_WEBHOOK_URL");
  if (!secret) throw new Error("Missing N8N_WEBHOOK_SECRET");

  const batchSize = Number(env("DISPATCH_BATCH_SIZE", "10"));
  const intervalMs = Number(env("DISPATCH_INTERVAL_MS", "2000"));
  const workerId = env("WORKER_ID", "outbox-dispatcher-1");
  const maxAttempts = Number(env("OUTBOX_MAX_ATTEMPTS", "8"));

  const pool = new Pool({
    connectionString: databaseUrl,
    max: Number(env("PG_POOL_SIZE", "5")),
    ssl:
      env("PG_SSL", "true") === "true" ? { rejectUnauthorized: false } : false,
  });

  console.log("[dispatcher] started", {
    batchSize,
    intervalMs,
    workerId,
    maxAttempts,
  });

  while (true) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // lock batch
      const { rows } = await client.query(
        `
        SELECT id, aggregate_type, aggregate_id, event_type, payload, attempts
        FROM outbox
        WHERE status IN ('pending','failed')
          AND (next_retry_at IS NULL OR next_retry_at <= now())
          AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
          AND attempts < $1
        ORDER BY created_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
        `,
        [maxAttempts, batchSize],
      );

      if (rows.length === 0) {
        await client.query("COMMIT");
        await client.release?.();
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }

      const ids = rows.map((r) => r.id);
      await client.query(
        `
        UPDATE outbox
        SET status='processing', locked_at=now(), locked_by=$1, updated_at=now()
        WHERE id = ANY($2::uuid[])
        `,
        [workerId, ids],
      );

      await client.query("COMMIT");

      // process outside transaction
      for (const evt of rows) {
        const outboxId = evt.id;
        const eventType = evt.event_type;
        const payload = evt.payload;

        const headers = {
          "x-webhook-secret": secret,
          "x-outbox-id": String(outboxId),
          "x-event-type": String(eventType),
        };

        try {
          const res = await postJson(n8nUrl, payload, headers);

          if (res.ok) {
            await pool.query(
              `
              UPDATE outbox
              SET status='done',
                  locked_at=NULL,
                  locked_by=NULL,
                  last_error=NULL,
                  next_retry_at=NULL,
                  updated_at=now()
              WHERE id=$1
              `,
              [outboxId],
            );
            console.log("[dispatcher] delivered", {
              outboxId,
              eventType,
              status: res.status,
            });
          } else {
            const attempts = Number(evt.attempts ?? 0) + 1;
            const retrySec = nextRetrySeconds(attempts);
            await pool.query(
              `
              UPDATE outbox
              SET status='failed',
                  attempts=attempts+1,
                  last_error=$2,
                  next_retry_at=now() + ($3 || ' seconds')::interval,
                  locked_at=NULL,
                  locked_by=NULL,
                  updated_at=now()
              WHERE id=$1
              `,
              [
                outboxId,
                `n8n http ${res.status}: ${String(res.text).slice(0, 4000)}`,
                String(retrySec),
              ],
            );
            console.log("[dispatcher] failed", {
              outboxId,
              eventType,
              status: res.status,
              retrySec,
            });
          }
        } catch (err) {
          const attempts = Number(evt.attempts ?? 0) + 1;
          const retrySec = nextRetrySeconds(attempts);
          await pool.query(
            `
            UPDATE outbox
            SET status='failed',
                attempts=attempts+1,
                last_error=$2,
                next_retry_at=now() + ($3 || ' seconds')::interval,
                locked_at=NULL,
                locked_by=NULL,
                updated_at=now()
            WHERE id=$1
            `,
            [
              outboxId,
              `dispatcher error: ${String(err?.message ?? err).slice(0, 4000)}`,
              String(retrySec),
            ],
          );
          console.log("[dispatcher] exception", {
            outboxId,
            eventType,
            retrySec,
            error: String(err?.message ?? err),
          });
        }
      }
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      console.error("[dispatcher] loop error", e);
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      client.release();
    }
  }
}

main().catch((e) => {
  console.error("[dispatcher] fatal", e);
  process.exit(1);
});
