// src/workers/outbox-dispatcher.js
const fs = require("fs");
const { Pool } = require("pg");

function readSecret(path) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function env(name, def) {
  return process.env[name] ?? def;
}

function toInt(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

function short(str, max = 900) {
  if (!str) return "";
  const s = String(str);
  return s.length <= max ? s : s.slice(0, max) + "...";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// backoff progressivo (min)
function nextDelayMinutes(attempts) {
  // attempts já é o valor "novo" (após +1)
  if (attempts <= 1) return 1;
  if (attempts === 2) return 5;
  if (attempts === 3) return 15;
  if (attempts === 4) return 60;
  if (attempts === 5) return 360; // 6h
  return 1440; // 24h
}

function normalizeEventType(t) {
  if (!t) return "";
  if (t === "APPOINTMENT_CREATED") return "appointment.created";
  return String(t);
}

function makeLockedBy() {
  // bom o suficiente: service@hostname
  const host = process.env.HOSTNAME || "unknown";
  return `sisag_outbox-dispatcher@${host}`;
}

async function fetchWithTimeout(url, payload, headers, timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

/**
 * ✅ claim ATÔMICO (sem corrida):
 * - pega até N eventos elegíveis (pending ou processing travado)
 * - marca status=processing + locked_at/locked_by
 * - COMMIT
 * Depois chama o n8n SEM segurar transação.
 */
async function claimBatch(pool, batchSize, lockedBy, lockTtlSeconds) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows } = await client.query(
      `
      with picked as (
        select id
        from public.outbox
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
      update public.outbox o
      set
        status = 'processing',
        locked_at = now(),
        locked_by = $3,
        updated_at = now()
      from picked
      where o.id = picked.id
      returning o.*;
      `,
      [batchSize, String(lockTtlSeconds), lockedBy],
    );

    await client.query("commit");
    return rows;
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function markSent(pool, id) {
  const client = await pool.connect();
  try {
    await client.query(
      `
      update public.outbox
      set status='sent',
          last_error=null,
          next_retry_at=null,
          locked_at=null,
          locked_by=null,
          updated_at=now()
      where id=$1
      `,
      [id],
    );
  } finally {
    client.release();
  }
}

async function markFailed(pool, evt, errMsg, maxAttempts) {
  const client = await pool.connect();
  try {
    const attempts = (evt.attempts ?? 0) + 1;
    const delayMin = nextDelayMinutes(attempts);
    const nextRetryAt = new Date(Date.now() + delayMin * 60 * 1000);

    const finalStatus = attempts >= maxAttempts ? "failed" : "pending";

    await client.query(
      `
      update public.outbox
      set status = $2,
          attempts = $3,
          last_error = $4,
          next_retry_at = $5,
          locked_at = null,
          locked_by = null,
          updated_at = now()
      where id=$1
      `,
      [
        evt.id,
        finalStatus,
        attempts,
        short(errMsg),
        finalStatus === "failed" ? null : nextRetryAt,
      ],
    );
  } finally {
    client.release();
  }
}

async function main() {
  const dbUrl =
    readSecret(process.env.DATABASE_URL_FILE) || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("[DISPATCHER] missing DATABASE_URL / DATABASE_URL_FILE");
    process.exit(1);
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[DISPATCHER] missing N8N_WEBHOOK_URL");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: toInt(env("PG_POOL_MAX", "5"), 5),
    idleTimeoutMillis: toInt(env("PG_IDLE_TIMEOUT_MS", "30000"), 30000),
    connectionTimeoutMillis: toInt(env("PG_CONN_TIMEOUT_MS", "10000"), 10000),
  });

  const batchSize = toInt(env("DISPATCH_BATCH_SIZE", "10"), 10);
  const intervalMs = toInt(env("DISPATCH_INTERVAL_MS", "5000"), 5000);
  const timeoutMs = toInt(env("N8N_TIMEOUT_MS", "8000"), 8000);
  const secret = env("N8N_WEBHOOK_SECRET", "");

  const lockedBy = env("DISPATCH_LOCKED_BY", makeLockedBy());
  const lockTtlSeconds = toInt(env("DISPATCH_LOCK_TTL_SECONDS", "300"), 300); // 5min
  const maxAttempts = toInt(env("DISPATCH_MAX_ATTEMPTS", "10"), 10);

  console.log("[DISPATCHER] started v3", {
    batchSize,
    intervalMs,
    timeoutMs,
    webhookUrl,
    lockedBy,
    lockTtlSeconds,
    maxAttempts,
  });

  while (true) {
    const t0 = Date.now();
    let claimed = 0;
    let sent = 0;
    let failed = 0;

    try {
      const rows = await claimBatch(pool, batchSize, lockedBy, lockTtlSeconds);
      claimed = rows.length;

      if (!claimed) {
        await sleep(intervalMs);
        continue;
      }

      for (const evt of rows) {
        try {
          const eventType = normalizeEventType(evt.event_type);

          const payload = {
            eventId: evt.id,
            eventType,
            occurredAt: evt.created_at,

            aggregateType: evt.aggregate_type,
            aggregateId: evt.aggregate_id,

            attempts: evt.attempts ?? 0,
            payload: evt.payload,
          };

          const headers = { "content-type": "application/json" };
          if (secret) headers["x-sisag-secret"] = secret;

          const r = await fetchWithTimeout(
            webhookUrl,
            payload,
            headers,
            timeoutMs,
          );

          if (!r.ok) {
            throw new Error(`status=${r.status} body=${short(r.text)}`);
          }

          await markSent(pool, evt.id);
          sent++;
        } catch (e) {
          failed++;
          await markFailed(pool, evt, e?.message ?? String(e), maxAttempts);
        }
      }

      const dt = Date.now() - t0;
      console.log("[DISPATCHER] cycle", { claimed, sent, failed, ms: dt });
    } catch (e) {
      console.error("[DISPATCHER] loop error", short(e?.message ?? String(e)));
      await sleep(2000);
    }
  }
}

main();
