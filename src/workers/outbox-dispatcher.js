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

function short(str, max = 900) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "...";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function main() {
  const dbUrl =
    readSecret(process.env.DATABASE_URL_FILE) || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("[DISPATCHER] missing DATABASE_URL");
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
  });

  const batchSize = parseInt(env("DISPATCH_BATCH_SIZE", "10"));
  const intervalMs = parseInt(env("DISPATCH_INTERVAL_MS", "2000"));
  const timeoutMs = parseInt(env("N8N_TIMEOUT_MS", "8000"));
  const secret = env("N8N_WEBHOOK_SECRET", "");

  console.log("[DISPATCHER] started");

  while (true) {
    const client = await pool.connect();
    try {
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

      if (!rows.length) {
        await sleep(intervalMs);
        continue;
      }

      console.log("[DISPATCHER] claimed", rows.length);

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

          await client.query(
            `
            update public.outbox
            set status='sent',
                last_error=null,
                next_retry_at=null,
                updated_at=now()
            where id=$1
            `,
            [evt.id]
          );
        } catch (e) {
          const attempts = (evt.attempts ?? 0) + 1;
          const nextRetry = new Date(Date.now() + 5 * 60000);

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
              short(e.message),
              nextRetry,
            ]
          );
        }
      }
    } catch (e) {
      console.error("[DISPATCHER] loop error", e.message);
      await sleep(2000);
    } finally {
      client.release();
    }
  }
}

main();
