// src/workers/outbox-dispatcher.js
// Standalone Outbox Dispatcher

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
    readFileIfExists(process.env.DB_PASSWORD_FILE);

  if (fromFile && fromFile.startsWith("postgres")) return fromFile;

  const direct = process.env.DATABASE_URL;
  if (direct) return direct;

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

  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(
    pass,
  )}@${host}:${port}/${db}${ssl ? "?sslmode=require" : ""}`;
}

function getWebhookConfig() {
  const url = process.env.N8N_WEBHOOK_URL || process.env.N8N_TARGET_URL;
  const secret =
    process.env.N8N_WEBHOOK_SECRET || process.env.OUTBOX_WEBHOOK_SECRET;

  return { url, secret };
}

function computeBackoff(attempts) {
  const seconds = [10, 30, 120, 300, 900, 3600][Math.min(attempts || 0, 5)];
  return new Date(Date.now() + seconds * 1000);
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function getPayloadText(payload) {
  return payload?.message || payload?.text || payload?.body || "";
}

function getProviderName() {
  return String(process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();
}

async function sendViaMock({ toPhone, text }) {
  return {
    ok: true,
    provider: "mock",
    providerMessageId: `mock_${crypto.randomUUID()}`,
    response: {
      ok: true,
      mocked: true,
      toPhone,
      text,
    },
  };
}

async function sendViaMeta({ toPhone, text, templateName, templateLanguage }) {
  const apiBase = process.env.WA_API_BASE || "https://graph.facebook.com";
  const graphVersion =
    process.env.WA_GRAPH_VERSION || process.env.META_API_VERSION || "v25.0";

  const phoneNumberId =
    process.env.WA_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID;

  const token =
    readFileIfExists(process.env.WA_CLOUD_TOKEN_FILE) ||
    readFileIfExists(process.env.META_ACCESS_TOKEN_FILE) ||
    process.env.WA_CLOUD_TOKEN ||
    process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId) {
    return {
      ok: false,
      provider: "meta",
      error: "WA_PHONE_NUMBER_ID missing",
      response: null,
    };
  }

  if (!token) {
    return {
      ok: false,
      provider: "meta",
      error: "WA cloud token missing",
      response: null,
    };
  }

  const to = normalizePhone(toPhone);

  if (!to) {
    return {
      ok: false,
      provider: "meta",
      error: "invalid_to_phone",
      response: null,
    };
  }

  const messagePayload = templateName
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateLanguage || "en_US",
          },
        },
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      };

  const response = await fetch(
    `${apiBase}/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messagePayload),
    },
  );

  const responsePayload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      provider: "meta",
      error:
        responsePayload?.error?.message ||
        responsePayload?.error?.type ||
        "meta_send_failed",
      response: responsePayload,
    };
  }

  return {
    ok: true,
    provider: "meta",
    providerMessageId: responsePayload?.messages?.[0]?.id ?? null,
    response: responsePayload,
  };
}

async function sendWhatsApp({ toPhone, text, templateName, templateLanguage }) {
  const provider = getProviderName();

  if (provider === "mock") {
    return sendViaMock({ toPhone, text });
  }

  if (provider === "meta") {
    return sendViaMeta({
      toPhone,
      text,
      templateName,
      templateLanguage,
    });
  }

  return {
    ok: false,
    provider,
    error: `unsupported provider: ${provider}`,
    response: {
      error: `unsupported provider: ${provider}`,
    },
  };
}

async function insertMessageLog(client, params) {
  const {
    companyId,
    outboxId,
    provider,
    status,
    providerMessageId,
    toPhone,
    body,
    error,
    responsePayload,
  } = params;

  const q = `
    INSERT INTO message_logs (
      company_id,
      outbox_id,
      channel,
      provider,
      to_phone,
      body,
      status,
      provider_message_id,
      error,
      response_payload,
      sent_at,
      failed_at,
      created_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      'whatsapp',
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9::jsonb,
      $10,
      $11,
      NOW()
    )
  `;

  await client.query(q, [
    companyId,
    outboxId,
    provider,
    toPhone,
    body,
    status,
    providerMessageId || null,
    error || null,
    JSON.stringify(responsePayload || null),
    status === "sent" ? new Date() : null,
    status === "failed" ? new Date() : null,
  ]);
}

async function handleWhatsAppSendRequested(client, row) {
  const payload = row.payload || {};
  const text = getPayloadText(payload);
  const toPhone = payload.toPhone;
  const companyId = payload.companyId;
  const clientId = payload.clientId || null;

  if (!companyId || !toPhone || !text) {
    await insertMessageLog(client, {
      companyId: companyId || "00000000-0000-0000-0000-000000000000",
      clientId,
      outboxId: row.id,
      provider: getProviderName(),
      status: "failed",
      providerMessageId: null,
      toPhone: toPhone || "",
      body: text || "",
      error: "invalid_whatsapp_payload",
      responsePayload: {
        error: "invalid_whatsapp_payload",
        payload,
      },
    });

    return;
  }
  const send = await sendWhatsApp({
    toPhone,
    text,
    templateName: payload.templateName || null,
    templateLanguage: payload.templateLanguage || "en_US",
  });

  if (send.ok) {
    await insertMessageLog(client, {
      companyId,
      clientId,
      outboxId: row.id,
      provider: send.provider,
      status: "sent",
      providerMessageId: send.providerMessageId,
      toPhone,
      body: text,
      error: null,
      responsePayload: send.response,
    });

    return;
  }

  await insertMessageLog(client, {
    companyId,
    clientId,
    outboxId: row.id,
    provider: send.provider || getProviderName(),
    status: "failed",
    providerMessageId: null,
    toPhone,
    body: text,
    error: send.error || "send_failed",
    responsePayload: send.response || {
      error: send.error || "send_failed",
    },
  });
}

async function postJson(url, body, headers, signal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
    signal,
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
}

async function outboxClaimBatch(client, params) {
  const batchSize = Number(params.batchSize || 10);
  const workerId = String(params.workerId || "outbox-dispatcher-1");
  const maxAttempts = Number(params.maxAttempts || 8);

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
    whatsappProvider: getProviderName(),
  });

  async function postN8n(payload) {
    if (!webhookUrl) {
      throw new Error("Missing N8N_WEBHOOK_URL or N8N_TARGET_URL.");
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      return await postJson(
        webhookUrl,
        payload,
        webhookSecret ? { "x-webhook-secret": webhookSecret } : {},
        ac.signal,
      );
    } finally {
      clearTimeout(t);
    }
  }

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
          if (eventType === "whatsapp.send.requested") {
            await handleWhatsAppSendRequested(client, row);
          } else {
            await postN8n({
              outboxId,
              eventType,
              payload,
            });
          }

          await outboxMarkDone(client, outboxId, workerId);

          logger.debug("[dispatcher] done", {
            outboxId,
            eventType,
          });
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
