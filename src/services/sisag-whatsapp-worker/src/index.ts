//src/services/sisag-whatsapp-worker/src/index.ts
import {
  fetchPendingOutbox,
  markOutboxFailed,
  markOutboxSent,
} from "./outbox.js";
import { sendMock } from "./send.js";
import { logError, logInfo, logWarn } from "./log.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

async function handleOutbox(item: any) {
  const eventType = normalizeEventType(item.event_type);

  if (eventType !== "appointment.created") {
    logWarn("skipping eventType", { outboxId: item.id, eventType });
    await markOutboxSent(item.id); // ou marque como 'ignored' se você tiver esse status
    return;
  }

  // Se no futuro você quiser usar payload do outbox, dá pra fazer aqui.
  // Por enquanto, o worker vai buscar direto os dados via API interna? (não implementado)
  // Como estamos em mock, vamos enviar algo mínimo e você pode evoluir depois.
  const companyId = item.payload?.companyId ?? item.payload?.company_id;
  const toPhone = item.payload?.toPhone ?? item.payload?.to_phone;
  const text = item.payload?.text ?? item.payload?.message;

  if (!companyId || !toPhone || !text) {
    throw new Error("outbox payload missing companyId/toPhone/text");
  }

  await sendMock({ companyId, toPhone, text });
  await markOutboxSent(item.id);
  logInfo("outbox sent", { outboxId: item.id });
}

async function main() {
  const batchSize = Number(process.env.BATCH_SIZE ?? "5");
  const pollMs = Number(process.env.POLL_MS ?? "1500");
  const maxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS ?? "8");

  logInfo("worker started", { batchSize, pollMs, maxAttempts });

  while (true) {
    try {
      const items = await fetchPendingOutbox(batchSize);
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
          await handleOutbox(item);
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
