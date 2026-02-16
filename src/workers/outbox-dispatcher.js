// src/workers/outbox-dispatcher.js
import {
  outboxClaimBatch,
  outboxMarkDone,
  outboxMarkFailed,
} from "@/modules/outbox/outbox.repository";

import {
  messageLogExistsForOutbox,
  messageLogCreate,
} from "@/modules/messageLogs/messageLogs.repository";

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

function pickCompanyIdFromPayload(payload) {
  return payload?.companyId || payload?.company_id || null;
}

function pickToPhoneFromPayload(payload) {
  return (
    payload?.client?.phoneE164 ||
    payload?.client?.phone_e164 ||
    payload?.toPhone ||
    payload?.to_phone ||
    null
  );
}

export async function runOutboxDispatcherLoop() {
  const WORKER_ID =
    process.env.OUTBOX_WORKER_ID ||
    `worker-${Math.random().toString(16).slice(2)}`;

  const BATCH = Number(process.env.OUTBOX_BATCH_SIZE || "20");
  const INTERVAL_MS = Number(process.env.OUTBOX_INTERVAL_MS || "1500");

  const N8N_WEBHOOK_URL = process.env.N8N_OUTBOX_WEBHOOK_URL;
  const N8N_WEBHOOK_SECRET = process.env.N8N_OUTBOX_WEBHOOK_SECRET || "";

  if (!N8N_WEBHOOK_URL) {
    throw new Error("Missing env N8N_OUTBOX_WEBHOOK_URL");
  }

  // loop infinito (worker)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await outboxClaimBatch({
      workerId: WORKER_ID,
      limit: BATCH,
    });

    for (const evt of batch) {
      try {
        // 1) Idempotência hard: se já existe message_log pro outboxId, marca done e segue
        const alreadySent = await messageLogExistsForOutbox(evt.id);
        if (alreadySent) {
          await outboxMarkDone({ id: evt.id, workerId: WORKER_ID });
          continue;
        }

        // 2) Envia pro n8n
        const requestPayload = {
          outboxId: evt.id,
          eventType: evt.eventType,
          aggregateType: evt.aggregateType,
          aggregateId: evt.aggregateId,
          payload: evt.payload,
        };

        const response = await postJson(
          N8N_WEBHOOK_URL,
          requestPayload,
          N8N_WEBHOOK_SECRET ? { "x-webhook-secret": N8N_WEBHOOK_SECRET } : {},
        );

        // 3) Message log (sent)
        const companyId = pickCompanyIdFromPayload(evt.payload);
        if (!companyId) {
          throw new Error(
            "Missing companyId in payload (outbox contract violated)",
          );
        }

        const toPhone = pickToPhoneFromPayload(evt.payload) || "unknown";

        await messageLogCreate({
          companyId,
          outboxId: evt.id,
          channel: "whatsapp",
          provider: "n8n",
          toPhone,
          body: JSON.stringify(evt.payload),
          status: "sent",
          requestPayload,
          responsePayload: response,
          sentAt: new Date(),
        });

        // 4) Marca done
        await outboxMarkDone({ id: evt.id, workerId: WORKER_ID });
      } catch (err) {
        const attempts = evt.attempts || 0;
        const nextRetryAt = computeBackoff(attempts);

        // opcional: registra falha em message_logs
        const companyId = pickCompanyIdFromPayload(evt.payload);
        if (companyId) {
          const toPhone = pickToPhoneFromPayload(evt.payload) || "unknown";

          try {
            await messageLogCreate({
              companyId,
              outboxId: evt.id,
              channel: "whatsapp",
              provider: "n8n",
              toPhone,
              body: JSON.stringify(evt.payload),
              status: "failed",
              error: String(err?.message || err),
              failedAt: new Date(),
            });
          } catch {
            // ignore
          }
        }

        await outboxMarkFailed({
          id: evt.id,
          workerId: WORKER_ID,
          errorMessage: String(err?.message || err),
          nextRetryAt,
        });
      }
    }

    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

// Se você preferir rodar direto ao importar:
// runOutboxDispatcherLoop().catch((e) => {
//   console.error("[outbox-dispatcher] fatal", e);
//   process.exit(1);
// });
