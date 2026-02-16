/**
 * Standalone Outbox Dispatcher (Node 20+)
 * - Sem imports do app (sem "@/...")
 * - Usa pg para Postgres/Supabase
 * - Usa fetch nativo para chamar n8n
 */

const fs = require("fs");
const { Pool } = require("pg");

function readFileIfExists(path) {
  try {
    if (!path) return null;
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function buildDbUrl() {
  const fromFile = readFileIfExists(process.env.DATABASE_URL_FILE);
  if (fromFile) return fromFile;

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // fallback (se você usa DB_HOST/DB_NAME/DB_USER etc)
  const host = process.env.DB_HOST;
  const dbName = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass =
    readFileIfExists(process.env.DB_PASSWORD_FILE) || process.env.DB_PASSWORD;
  const port = process.env.DB_PORT || "5432";

  if (!host || !dbName || !user || !pass) {
    throw new Error(
      "DB config missing. Provide DATABASE_URL_FILE, DATABASE_URL, or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE).",
    );
  }

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postJson(url, body, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, text };
}

function nextRetrySeconds(attempts) {
  // backoff simples: 5, 10, 20, 40, 80...
  return Math.min(300, 5 * Math.pow(2, Math.max(0, attempts - 1)));
}

async function main() {
  const N8N_WEBHOOK_URL =
    process.env.N8N_WEBHOOK_URL ||
    process.env.N8N_TARGET_URL ||
    mustEnv("N8N_WEBHOOK_URL"); // garante

  const N8N_WEBHOOK_SECRET =
    readFileIfExists(process.env.N8N_WEBHOOK_SECRET_FILE) ||
    process.env.N8N_WEBHOOK_SECRET ||
    process.env.OUTBOX_WEBHOOK_SECRET ||
    "";

  const batchSize = parseInt(process.env.DISPATCH_BATCH_SIZE || "10", 10);
  const intervalMs = parseInt(process.env.DISPATCH_INTERVAL_MS || "2000", 10);
  const timeoutMs = parseInt(process.env.N8N_TIMEOUT_MS || "8000", 10);
  const workerId =
    process.env.WORKER_ID ||
    `dispatcher-${Math.random().toString(16).slice(2)}`;

  const dbUrl = buildDbUrl();

  const pool = new Pool({
    connectionString: dbUrl,
    max: parseInt(process.env.PG_POOL_SIZE || "5", 10),
    ssl:
      process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  console.log("[dispatcher] started", {
    batchSize,
    intervalMs,
    timeoutMs,
    workerId,
    n8n: N8N_WEBHOOK_URL,
  });

  while (true) {
    const client = await pool.connect();
    try {
      // 1) pega e "trava" itens pendentes / failed elegíveis
      //    usando SKIP LOCKED para multi-worker seguro
      const now = new Date();

      await client.query("BEGIN");

      const { rows } = await client.query(
        `
        SELECT id, event_type, payload, attempts
        FROM outbox
        WHERE
          status IN ('pending','failed')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        `,
        [batchSize],
      );

      if (rows.length === 0) {
        await client.query("COMMIT");
        client.release();
        await sleep(intervalMs);
        continue;
      }

      // marca como processing + lock
      const ids = rows.map((r) => r.id);
      await client.query(
        `
        UPDATE outbox
        SET status='processing',
            locked_at=NOW(),
            locked_by=$1,
            updated_at=NOW()
        WHERE id = ANY($2::uuid[])
        `,
        [workerId, ids],
      );

      await client.query("COMMIT");
      client.release();

      // 2) dispatch item a item (fora da transação)
      for (const r of rows) {
        const outboxId = r.id;
        const eventType = r.event_type;
        const payload = r.payload;
        const attempts = Number(r.attempts || 0);

        // safety: timeout no fetch (Node 20)
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), timeoutMs);

        try {
          const headers = {};
          if (N8N_WEBHOOK_SECRET)
            headers["x-outbox-secret"] = N8N_WEBHOOK_SECRET;

          const res = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify({ outboxId, eventType, payload }),
            signal: ac.signal,
          });

          const text = await res.text().catch(() => "");
          clearTimeout(t);

          if (res.ok) {
            await pool.query(
              `
              UPDATE outbox
              SET status='done',
                  last_error=NULL,
                  updated_at=NOW()
              WHERE id=$1
              `,
              [outboxId],
            );
            console.log("[dispatcher] dispatched", {
              outboxId,
              eventType,
              status: res.status,
            });
          } else {
            const nextSec = nextRetrySeconds(attempts + 1);
            await pool.query(
              `
              UPDATE outbox
              SET status='failed',
                  attempts=attempts+1,
                  last_error=$2,
                  next_retry_at=NOW() + ($3 || ' seconds')::interval,
                  updated_at=NOW()
              WHERE id=$1
              `,
              [
                outboxId,
                `n8n_http_${res.status}: ${text.slice(0, 500)}`,
                String(nextSec),
              ],
            );
            console.log("[dispatcher] failed -> retry", {
              outboxId,
              eventType,
              http: res.status,
              nextSec,
            });
          }
        } catch (err) {
          clearTimeout(t);
          const msg = String(err?.message || err);
          const nextSec = nextRetrySeconds(attempts + 1);

          await pool.query(
            `
            UPDATE outbox
            SET status='failed',
                attempts=attempts+1,
                last_error=$2,
                next_retry_at=NOW() + ($3 || ' seconds')::interval,
                updated_at=NOW()
            WHERE id=$1
            `,
            [outboxId, msg.slice(0, 500), String(nextSec)],
          );

          console.log("[dispatcher] error -> retry", {
            outboxId,
            eventType,
            msg,
            nextSec,
          });
        } finally {
          // sempre solta lock
          await pool.query(
            `
            UPDATE outbox
            SET locked_at=NULL, locked_by=NULL, updated_at=NOW()
            WHERE id=$1
            `,
            [outboxId],
          );
        }
      }
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      client.release();
      console.error("[dispatcher] loop error", e);
      await sleep(intervalMs);
    }
  }
}

main().catch((e) => {
  console.error("[dispatcher] fatal", e);
  process.exit(1);
});
