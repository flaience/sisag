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
  // backoff simples: 5s, 15s, 45s, 120s...
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

// Reserva idempotente (unique por outbox_id)
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

async function getMessageLogStatusByOutboxId(pool: Pool, outboxId: string) {
  const { rows } = await pool.query(
    `select id, status from public.message_logs where outbox_id = $1 limit 1`,
    [outboxId],
  );
  return rows[0] as { id: string; status: string } | undefined;
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
  // prefer E.164
  return (
    item.payload?.toPhone ??
    item.payload?.to_phone ??
    item.payload?.client?.phoneE164 ??
    item.payload?.client?.phone_e164 ??
    item.payload?.client?.phone ??
    item.payload?.client?.whatsapp
  );
}

function extractScheduledTime(item: any): string | undefined {
  const st =
    item.payload?.appointment?.scheduledTime ??
    item.payload?.appointment?.scheduled_time ??
    item.payload?.scheduledTime ??
    item.payload?.scheduled_time;
  if (!st) return undefined;
  return String(st);
}

function extractClientName(item: any): string | undefined {
  const n =
    item.payload?.client?.name ??
    item.payload?.clientName ??
    item.payload?.client_name;
  return n ? String(n) : undefined;
}

function extractProfessionalName(item: any): string | undefined {
  const n =
    item.payload?.professional?.name ??
    item.payload?.professionalName ??
    item.payload?.professional_name;
  return n ? String(n) : undefined;
}

function formatPtBRDateTime(iso: string): string {
  // MVP: usa UTC mesmo; depois você ajusta timezone/locale com env
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function buildConfirmationText(item: any): string {
  const scheduled = extractScheduledTime(item);
  const when = scheduled ? formatPtBRDateTime(scheduled) : null;

  const prof = extractProfessionalName(item);
  const client = extractClientName(item);

  const lines: string[] = [];
  lines.push("Agendamento confirmado ✅");
  if (client) lines.push(`Paciente: ${client}`);
  if (prof) lines.push(`Profissional: ${prof}`);
  if (when) lines.push(`Data/Hora: ${when}`);
  lines.push("");
  lines.push("Se precisar remarcar, é só responder aqui.");

  return lines.join("\n");
}

function extractText(item: any): string | undefined {
  const raw =
    item.payload?.body ?? // ✅ novo (ConversationEngine)
    item.payload?.text ??
    item.payload?.message ??
    item.payload?.message_text ??
    item.payload?.templateText;

  if (raw && String(raw).trim().length > 0) return String(raw).trim();

  // fallback só para appointment.created
  return buildConfirmationText(item);
}

async function handleOutbox(pool: Pool, item: any) {
  const eventType = normalizeEventType(item.event_type);

  // ✅ allowlist do worker (core)
  // - appointment.created: gera msg de confirmação (fallback)
  // - whatsapp.send.requested: já vem com {companyId,toPhone,text} e deve ser enviado “as-is”
  const allowed =
    eventType === "appointment.created" ||
    eventType === "whatsapp.send.requested" ||
    eventType === "whatsapp.send_text";

  if (!allowed) {
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

  // ✅ para whatsapp.send.requested, NÃO usa fallback de confirmação:
  // precisa existir text explícito
  let text: string | undefined;
  if (
    eventType === "whatsapp.send.requested" ||
    eventType === "whatsapp.send_text"
  ) {
    const raw =
      item.payload?.body ?? // ✅ novo
      item.payload?.text ??
      item.payload?.message ??
      item.payload?.message_text ??
      item.payload?.templateText;

    text =
      raw && String(raw).trim().length > 0 ? String(raw).trim() : undefined;
  } else {
    text = extractText(item);
  }

  if (!companyId || !toPhone || !text) {
    throw new Error("outbox payload missing companyId/toPhone/text");
  }

  const provider = env("WHATSAPP_PROVIDER", "mock");

  // ✅ idempotência: se já tiver log sent por outbox_id, não reenvia
  const existing = await getMessageLogStatusByOutboxId(pool, item.id);
  if (existing?.status === "sent") {
    logInfo("idempotency hit - already sent", {
      outboxId: item.id,
      messageLogId: existing.id,
    });
    await markOutboxSent(item.id);
    return;
  }

  // ✅ reserva idempotente (unique por outbox_id)
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

  if (reserve.ok === false) {
    throw new Error(`reserveMessageLog failed: ${reserve.error}`);
  }

  // outra instância já reservou; evita envio duplicado
  if (!reserve.reserved) {
    logInfo("idempotency hit - skipping send", { outboxId: item.id });
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
      eventType,
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
  const lockTtlSeconds = Number(env("WORKER_LOCK_TTL_SECONDS", "300")); // aparece no log

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
            await markOutboxFailed(item.id, "max attempts reached", 3600);
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

          await markOutboxFailed(item.id, msg, next);
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
