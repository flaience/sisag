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
  return str.length <= max ? str : str.slice(0, max) + "...";
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
  // depois disso, 2h fixo (ajuste se quiser)
  return 120;
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

async function claimBatch(pool, batchSize) {
  const client = await pool.connect();
  try {
    // ✅ claim rápido numa transação curta (libera locks antes de fazer fetch no n8n)
    await client.query("begin");
    const { rows } = await client.query(
      `
      with picked as (
        select id
        from public.outbox
        where
          status = 'pending'
          or (status = 'retrying' and (next_retry_at is null or next_retry_at < now()))
        order by created_at asc
        limit $1
        for update skip locked
      )
      update public.outbox o
      set status = 'processing',
          updated_at = now()
      from picked
      where o.id = picked.id
      returning o.*;
      `,
      [batchSize]
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
          updated_at=now()
      where id=$1
      `,
      [id]
    );
  } finally {
    client.release();
  }
}

async function markFailed(pool, evt, errMsg) {
  const client = await pool.connect();
  try {
    const attempts = (evt.attempts ?? 0) + 1;
    const delayMin = nextDelayMinutes(attempts);
    const nextRetryAt = new Date(Date.now() + delayMin * 60 * 1000);

    await client.query(
      `
      update public.outbox
      set status = $2,
          attempts = $3,
          last_error = $4,
          next_retry_at = $5,
          updated_at = now()
      where id=$1
      `,
      [
        evt.id,
        attempts >= 10 ? "dead" : "retrying",
        attempts,
        short(errMsg),
        nextRetryAt,
      ]
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

  console.log("[DISPATCHER] started", {
    batchSize,
    intervalMs,
    timeoutMs,
    webhookUrl,
  });

  while (true) {
    const t0 = Date.now();
    let claimed = 0;
    let sent = 0;
    let failed = 0;

    try {
      const rows = await claimBatch(pool, batchSize);
      claimed = rows.length;

      if (!claimed) {
        // sem trabalho
        await sleep(intervalMs);
        continue;
      }

      for (const evt of rows) {
        try {
          const payload = {
            id: evt.id,
            aggregateType: evt.aggregate_type,
            aggregateId: evt.aggregate_id,
            eventType: evt.event_type,
            payload: evt.payload,
            attempts: evt.attempts ?? 0,
            createdAt: evt.created_at,
          };

          const headers = { "content-type": "application/json" };
          if (secret) headers["x-sisag-secret"] = secret;

          const r = await fetchWithTimeout(
            webhookUrl,
            payload,
            headers,
            timeoutMs
          );

          if (!r.ok) {
            throw new Error(`status=${r.status} body=${short(r.text)}`);
          }

          await markSent(pool, evt.id);
          sent++;
        } catch (e) {
          failed++;
          await markFailed(pool, evt, e?.message ?? String(e));
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
