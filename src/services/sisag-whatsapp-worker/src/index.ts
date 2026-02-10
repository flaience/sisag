// src/services/sisag-whatsapp-worker/src/index.ts
import fs from "fs";
import { Pool } from "pg";

import {
  fetchPendingOutbox,
  markOutboxFailed,
  markOutboxSent,
} from "./outbox.js";

import { sendMock } from "./send.js";
import { logError, logInfo, logWarn } from "./log.js";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function short(str: any, max = 900) {
  if (!str) return "";
  const s = String(str);
  return s.length <= max ? s : s.slice(0, max) + "...";
}

function retryDelaySeconds(attempts: number) {
  const base = 5;
  return Math.min(600, base * Math.pow(3, Math.max(0, attempts)));
}

function normalizeEventType(et: string) {
  const t = (et ?? "").trim();
  if (t === "APPOINTMENT_CREATED") return "appointment.created";
  return t;
}

function env(name: string, def: string) {
  return process.env[name] ?? def;
}

function buildPool() {
  const dbUrl =
    readSecret(process.env.DATABASE_URL_FILE) || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error("missing DATABASE_URL / DATABASE_URL_FILE");
  }

  return new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: Number(env("PG_POOL_MAX", "5")),
    idleTimeoutMillis: Number(env("PG_IDLE_TIMEOUT_MS", "30000")),
    connectionTimeoutMillis: Number(env("PG_CONN_TIMEOUT_MS", "10000")),
  });
}

type MessageLogReserveResult =
  | { ok: true; reserved: true; messageLogId: string }
  | { ok: true; reserved: false }
  | { ok: false; error: string };

async function reserveMessageLog(
  pool: Pool,
  args: {
    companyId: string;
    outboxId: string;
    provider: string;
    toPhone: string;
    text: string;
    requestPayload?: any;
  },
): Promise<MessageLogReserveResult> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `
      insert into public.message_logs (
        company_id,
        outbox_id,
        channel,
        provider,
        to_phone,
        message_type,
        body,
        status,
        request_payload,
        created_at
      ) values (
        $1, $2, 'whatsapp', $3, $4, 'text', $5, 'queued', $6, now()
      )
      on conflict do nothing
      returning id;
      `,
      [
        args.companyId,
        args.outboxId,
        args.provider,
        args.toPhone,
        args.text,
        args.requestPayload ? JSON.stringify(args.requestPayload) : null,
      ],
    );

    if (res.rowCount === 0) return { ok: true, reserved: false };
    return { ok: true, reserved: true, messageLogId: res.rows[0].id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  } finally {
    client.release();
  }
}

async function updateMessageLogSent(
  pool: Pool,
  args: {
    messageLogId: string;
    providerMessageId?: string | null;
    responsePayload?: any;
  },
) {
  const client = await pool.connect();
  try {
    await client.query(
      `
      update public.message_logs
      set status='sent',
          provider_message_id=$2,
          response_payload=$3,
          sent_at=now()
      where id=$1
      `,
      [
        args.messageLogId,
        args.providerMessageId ?? null,
        args.responsePayload ? JSON.stringify(args.responsePayload) : null,
      ],
    );
  } finally {
    client.release();
  }
}

async function updateMessageLogFailed(
  pool: Pool,
  args: {
    messageLogId: string;
    error: string;
    responsePayload?: any;
  },
) {
  const client = await pool.connect();
  try {
    await client.query(
      `
      update public.message_logs
      set status='failed',
          error=$2,
          response_payload=$3,
          failed_at=now()
      where id=$1
      `,
      [
        args.messageLogId,
        short(args.error),
        args.responsePayload ? JSON.stringify(args.responsePayload) : null,
      ],
    );
  } finally {
    client.release();
  }
}

function extractCompanyId(item: any): string | undefined {
  return (
    item.payload?.companyId ??
    item.payload?.company_id ??
    item.payload?.appointment?.companyId ??
    item.payload?.appointment?.company_id
  );
}

function extractToPhone(item: any): string | undefined {
  return (
    item.payload?.toPhone ??
    item.payload?.to_phone ??
    item.payload?.client?.phoneE164 ??
    item.payload?.client?.phone_e164 ??
    item.payload?.client?.phone ??
    item.payload?.client?.whatsapp
  );
}

function extractText(item: any): string | undefined {
  return (
    item.payload?.text ??
    item.payload?.message ??
    item.payload?.message_text ??
    item.payload?.templateText
  );
}

/**
 * ✅ Idempotência forte:
 * - se já existe message_logs para esse outbox_id, não envia novamente
 * - retorna {id,status} ou undefined
 */
async function getMessageLogStatusByOutboxId(pool: Pool, outboxId: string) {
  const { rows } = await pool.query(
    `
    select id, status
    from public.message_logs
    where outbox_id = $1
    limit 1
    `,
    [outboxId],
  );
  return rows[0] as { id: string; status: string } | undefined;
}

async function handleOutbox(pool: Pool, item: any) {
  const eventType = normalizeEventType(item.event_type);

  if (eventType !== "appointment.created") {
    logWarn("unsupported eventType - marking failed", {
      outboxId: item.id,
      eventType,
    });

    await markOutboxFailed(
      item.id,
      `unsupported eventType: ${eventType}`,
      3600,
    );

    return;
  }

  const companyId = extractCompanyId(item);
  const toPhone = extractToPhone(item);
  const text = extractText(item);

  if (!companyId || !toPhone || !text) {
    throw new Error("outbox payload missing companyId/toPhone/text");
  }

  const provider = env("WHATSAPP_PROVIDER", "mock");

  // ✅ 1) Curto-circuito: se já existe log, não envia de novo (idempotência real)
  const existing = await getMessageLogStatusByOutboxId(pool, item.id);
  if (existing) {
    logInfo("idempotency hit - existing message log", {
      outboxId: item.id,
      messageLogId: existing.id,
      status: existing.status,
    });
    await markOutboxSent(item.id);
    return;
  }

  // ✅ 2) Reserva idempotente (se outra réplica ganhar corrida, reserved=false)
  const reserve = await reserveMessageLog(pool, {
    companyId,
    outboxId: item.id,
    provider,
    toPhone,
    text,
    requestPayload: {
      outboxId: item.id,
      eventType,
      companyId,
      toPhone,
      text,
    },
  });

  if (!reserve.ok) {
    throw new Error(`reserveMessageLog failed: ${reserve.error}`);
  }

  if (!reserve.reserved) {
    logInfo("idempotency hit - reserve conflict (another worker reserved)", {
      outboxId: item.id,
    });
    await markOutboxSent(item.id);
    return;
  }

  try {
    let resp: any = null;

    if (provider === "mock") {
      resp = await sendMock({ companyId, toPhone, text });
    } else {
      throw new Error(`unsupported provider: ${provider}`);
    }

    await updateMessageLogSent(pool, {
      messageLogId: reserve.messageLogId,
      providerMessageId: resp?.providerMessageId ?? null,
      responsePayload: resp ?? null,
    });

    await markOutboxSent(item.id);
    logInfo("outbox sent", {
      outboxId: item.id,
      messageLogId: reserve.messageLogId,
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);

    await updateMessageLogFailed(pool, {
      messageLogId: reserve.messageLogId,
      error: msg,
      responsePayload: { error: msg },
    });

    throw e;
  }
}

async function main() {
  const batchSize = Number(env("BATCH_SIZE", "5"));
  const pollMs = Number(env("POLL_MS", "1500"));
  const maxAttempts = Number(env("OUTBOX_MAX_ATTEMPTS", "8"));
  const lockTtlSeconds = Number(env("WORKER_LOCK_TTL_SECONDS", "300"));

  const pool = buildPool();

  logInfo("worker started", {
    batchSize,
    pollMs,
    maxAttempts,
    lockTtlSeconds,
  });

  while (true) {
    try {
      const items = await fetchPendingOutbox(batchSize, { lockTtlSeconds });

      if (items.length === 0) {
        await sleep(pollMs);
        continue;
      }

      for (const item of items) {
        try {
          if ((item.attempts ?? 0) >= maxAttempts) {
            logWarn("max attempts reached, marking failed permanently", {
              outboxId: item.id,
            });
            await markOutboxFailed(item.id, "max attempts reached", 3600, {
              maxAttempts,
            });
            continue;
          }

          await handleOutbox(pool, item);
        } catch (e: any) {
          const msg = e?.message ?? String(e);
          const next = retryDelaySeconds(item.attempts ?? 0);

          logError("handle failed", {
            outboxId: item.id,
            error: msg,
            nextRetrySeconds: next,
          });

          await markOutboxFailed(item.id, msg, next, { maxAttempts });
        }
      }
    } catch (e: any) {
      logError("loop error", { error: e?.message ?? String(e) });
      await sleep(2000);
    }
  }
}

main().catch((e) => {
  logError("fatal", { error: e?.message ?? String(e) });
  process.exit(1);
});
