// src/workers/outbox-dispatcher.js
// Standalone Outbox Dispatcher (no TS path aliases / no "@/")

import fs from "node:fs";
import { Client } from "pg";

const logger = {
  info: (...args) => console.log("[dispatcher][info]", ...args),
  warn: (...args) => console.warn("[dispatcher][warn]", ...args),
  error: (...args) => console.error("[dispatcher][error]", ...args),
  debug: (...args) => {
    if ((process.env.LOG_LEVEL || "").toLowerCase() === "debug") {
      console.log("[dispatcher][debug]", ...args);
    }
  },
};

// ---------------------------
// env helpers
// ---------------------------
function readFileIfExists(p) {
  try {
    if (!p) return null;
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    return null;
  }
}

function getDatabaseUrl() {
  const fromFile =
    readFileIfExists(process.env.DATABASE_URL_FILE) ||
    readFileIfExists(process.env.DB_PASSWORD_FILE); // (fallback legacy - won't be used as URL)
  if (fromFile && fromFile.startsWith("postgres")) return fromFile;

  const direct = process.env.DATABASE_URL;
  if (direct) return direct;

  // legacy compose style
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || "5432";
  const db = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass =
    readFileIfExists(process.env.DB_PASSWORD_FILE) || process.env.DB_PASSWORD;

  if (!host || !db || !user || !pass) {
    throw new Error(
      "DB config missing. Provide DATABASE_URL_FILE, DATABASE_URL, or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE).",
    );
  }

  const ssl =
    String(
      process.env.PG_SSL || process.env.DB_SSL || "false",
    ).toLowerCase() === "true";

  // NOTE: if your URL needs special sslmode, adjust here
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(
    pass,
  )}@${host}:${port}/${db}${ssl ? "?sslmode=require" : ""}`;
}

function getWebhookConfig() {
  const url = process.env.N8N_WEBHOOK_URL || process.env.N8N_TARGET_URL;
  const secret =
    process.env.N8N_WEBHOOK_SECRET || process.env.OUTBOX_WEBHOOK_SECRET;

  if (!url) {
    throw new Error("Missing N8N_WEBHOOK_URL (or N8N_TARGET_URL).");
  }
  return { url, secret };
}

function computeBackoff(attempts) {
  // 0->10s, 1->30s, 2->2m, 3->5m, 4->15m, 5->1h (cap)
  const seconds = [10, 30, 120, 300, 900, 3600][Math.min(attempts || 0, 5)];
  return new Date(Date.now() + seconds * 1000);
}

async function postJson(url, body, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // ignore
  }

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text}`);
    err.status = res.status;
    err.body = parsed || text;
    throw err;
  }

  return parsed || text;
}

// ---------------------------
// outbox queries (standalone)
// ---------------------------

async function outboxClaimBatch(client, params) {
  const batchSize = Number(params.batchSize || 10);
  const workerId = String(params.workerId || "outbox-dispatcher-1");
  const maxAttempts = Number(params.maxAttempts || 8);

  // status: pending | processing | done | failed
  // columns: attempts, last_error, next_retry_at, locked_at, locked_by
  const q = `
    WITH picked AS (
      SELECT id
      FROM outbox
      WHERE
        status IN ('pending','failed')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        AND attempts < $3
      ORDER BY created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox o
    SET
      status = 'processing',
      locked_at = NOW(),
      locked_by = $2,
      updated_at = NOW()
    FROM picked
    WHERE o.id = picked.id
    RETURNING o.id, o.event_type, o.payload, o.attempts, o.created_at
  `;

  const { rows } = await client.query(q, [batchSize, workerId, maxAttempts]);
  return rows;
}

async function outboxMarkDone(client, outboxId, workerId) {
  const q = `
    UPDATE outbox
    SET
      status = 'done',
      locked_at = NULL,
      locked_by = NULL,
      last_error = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND locked_by = $2
  `;
  await client.query(q, [outboxId, workerId]);
}

async function outboxMarkFailed(client, outboxId, workerId, err, nextRetryAt) {
  const msg = String(err?.message || err || "unknown_error").slice(0, 4000);

  const q = `
    UPDATE outbox
    SET
      status = 'failed',
      attempts = attempts + 1,
      last_error = $3,
      next_retry_at = $4,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND locked_by = $2
  `;
  await client.query(q, [outboxId, workerId, msg, nextRetryAt]);
}

// ---------------------------
// main loop
// ---------------------------

async function main() {
  const dbUrl = getDatabaseUrl();
  const { url: webhookUrl, secret: webhookSecret } = getWebhookConfig();

  const batchSize = Number(process.env.DISPATCH_BATCH_SIZE || 10);
  const intervalMs = Number(process.env.DISPATCH_INTERVAL_MS || 2000);
  const timeoutMs = Number(process.env.N8N_TIMEOUT_MS || 8000);
  const maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS || 8);
  const workerId = String(process.env.WORKER_ID || "sisag-outbox-dispatcher-1");

  logger.debug("[dispatcher] started", {
    batchSize,
    intervalMs,
    timeoutMs,
    maxAttempts,
    workerId,
    webhookUrl,
  });

  // Node fetch timeout via AbortController
  async function postWithTimeout(payload) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      return await postJson(
        webhookUrl,
        payload,
        webhookSecret ? { "x-webhook-secret": webhookSecret } : {},
        { signal: ac.signal },
      );
    } finally {
      clearTimeout(t);
    }
  }

  // NOTE: we can't pass signal via current postJson signature, so inline:
  async function postN8n(payload) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${text}`);
        err.status = res.status;
        err.body = parsed || text;
        throw err;
      }

      return parsed || text;
    } finally {
      clearTimeout(t);
    }
  }

  // loop
  while (true) {
    const client = new Client({
      connectionString: dbUrl,
      ssl:
        String(process.env.PG_SSL || "false").toLowerCase() === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });

    try {
      await client.connect();

      await client.query("BEGIN");
      const batch = await outboxClaimBatch(client, {
        batchSize,
        workerId,
        maxAttempts,
      });
      await client.query("COMMIT");

      if (!batch.length) {
        await client.end();
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }

      for (const row of batch) {
        const outboxId = row.id;
        const eventType = row.event_type;
        const payload = row.payload;
        const attempts = row.attempts || 0;

        try {
          // envia para n8n
          await postN8n({
            outboxId,
            eventType,
            payload,
          });

          // marca done
          await outboxMarkDone(client, outboxId, workerId);
          logger.debug("[dispatcher] done", { outboxId, eventType });
        } catch (err) {
          const nextRetryAt = computeBackoff(attempts);
          await outboxMarkFailed(client, outboxId, workerId, err, nextRetryAt);
          logger.debug("[dispatcher] failed", {
            outboxId,
            eventType,
            error: String(err?.message || err),
            nextRetryAt: nextRetryAt.toISOString(),
          });
        }
      }

      await client.end();
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      try {
        await client.end();
      } catch {}

      logger.debug("[dispatcher] loop error", String(err?.message || err));
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
}

main().catch((e) => {
  console.error("[dispatcher] fatal", e);
  process.exit(1);
});
