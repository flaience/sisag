/* src/workers/outbox-dispatcher.js */
/* eslint-disable no-console */

import fs from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import pg from "pg";

const { Pool } = pg;

// ---------- env helpers ----------
function readFileIfExists(path) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function mustEnv(name, value) {
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function intEnv(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

// ---------- config ----------
const DATABASE_URL =
  readFileIfExists(process.env.DATABASE_URL_FILE) || process.env.DATABASE_URL;

const N8N_WEBHOOK_URL = mustEnv("N8N_WEBHOOK_URL", process.env.N8N_WEBHOOK_URL);
const N8N_WEBHOOK_SECRET =
  readFileIfExists(process.env.N8N_WEBHOOK_SECRET_FILE) ||
  process.env.N8N_WEBHOOK_SECRET ||
  "";

const DISPATCH_BATCH_SIZE = intEnv("DISPATCH_BATCH_SIZE", 10);
const DISPATCH_INTERVAL_MS = intEnv("DISPATCH_INTERVAL_MS", 2000);
const N8N_TIMEOUT_MS = intEnv("N8N_TIMEOUT_MS", 8000);
const PG_POOL_SIZE = intEnv("PG_POOL_SIZE", 5);
const PG_SSL = boolEnv("PG_SSL", false); // opcional

if (!DATABASE_URL) {
  throw new Error(
    "DB config missing. Provide DATABASE_URL_FILE or DATABASE_URL",
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: PG_POOL_SIZE,
  ssl: PG_SSL ? { rejectUnauthorized: false } : undefined,
});

// ---------- http ----------
async function postJson(url, body, headers) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

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

// ---------- db ops ----------
async function lockBatch(client) {
  // pega pendentes + failed com retry vencido
  const q = `
    WITH picked AS (
      SELECT id
      FROM outbox
      WHERE
        status IN ('pending','failed')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox o
    SET
      status = 'processing',
      locked_at = now(),
      locked_by = $2,
      updated_at = now()
    FROM picked
    WHERE o.id = picked.id
    RETURNING o.id, o.event_type, o.payload, o.attempts
  `;
  const workerId = process.env.WORKER_ID || "outbox-dispatcher";
  const r = await client.query(q, [DISPATCH_BATCH_SIZE, workerId]);
  return r.rows;
}

async function markDone(client, id) {
  await client.query(
    `
    UPDATE outbox
    SET status='done', last_error=NULL, next_retry_at=NULL, updated_at=now()
    WHERE id=$1
  `,
    [id],
  );
}

async function markFailed(client, id, errMsg, attempts) {
  // backoff simples (segundos): 5, 10, 20, 40, 80...
  const base = 5;
  const delaySeconds = Math.min(base * Math.pow(2, attempts), 300); // cap 5min

  await client.query(
    `
    UPDATE outbox
    SET
      status='failed',
      attempts=attempts+1,
      last_error=$2,
      next_retry_at=now() + ($3 || ' seconds')::interval,
      updated_at=now()
    WHERE id=$1
  `,
    [id, errMsg?.slice?.(0, 2000) ?? String(errMsg), String(delaySeconds)],
  );
}

// ---------- main loop ----------
async function runOnce() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const batch = await lockBatch(client);
    await client.query("COMMIT");

    if (!batch.length) return;

    for (const row of batch) {
      const outboxId = row.id;
      const eventType = row.event_type;
      const payload = row.payload;
      const attempts = Number(row.attempts ?? 0);

      const headers = {};
      if (N8N_WEBHOOK_SECRET) {
        headers["x-webhook-secret"] = N8N_WEBHOOK_SECRET;
      }

      try {
        const res = await postJson(
          N8N_WEBHOOK_URL,
          {
            outboxId,
            eventType,
            payload,
          },
          headers,
        );

        if (!res.ok) {
          throw new Error(`n8n_http_${res.status}: ${res.text}`);
        }

        const c2 = await pool.connect();
        try {
          await markDone(c2, outboxId);
        } finally {
          c2.release();
        }

        console.log("[dispatcher] dispatched", { outboxId, eventType });
      } catch (err) {
        const c3 = await pool.connect();
        try {
          await markFailed(c3, outboxId, String(err?.message ?? err), attempts);
        } finally {
          c3.release();
        }

        console.error("[dispatcher] failed", {
          outboxId,
          eventType,
          error: String(err?.message ?? err),
        });
      }
    }
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[dispatcher] fatal", String(e?.message ?? e));
  } finally {
    client.release();
  }
}

async function main() {
  console.log("[dispatcher] started", {
    batchSize: DISPATCH_BATCH_SIZE,
    intervalMs: DISPATCH_INTERVAL_MS,
    timeoutMs: N8N_TIMEOUT_MS,
    poolSize: PG_POOL_SIZE,
  });

  // loop
  while (true) {
    await runOnce();
    await sleep(DISPATCH_INTERVAL_MS);
  }
}

main().catch((e) => {
  console.error("[dispatcher] boot error", String(e?.message ?? e));
  process.exit(1);
});
