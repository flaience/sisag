import express from "express";
import bodyParser from "body-parser";
import { Pool } from "pg";
import { sendMock } from "./send.js";
import { logInfo, logError } from "./log.js";

const app = express();
app.use(bodyParser.json());

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    (process.env.DATABASE_URL_FILE
      ? require("fs").readFileSync(process.env.DATABASE_URL_FILE, "utf8").trim()
      : undefined),
  ssl: { rejectUnauthorized: false },
});

app.post("/send", async (req, res) => {
  const { outboxId, companyId, toPhone, text, provider = "mock" } = req.body;

  if (!outboxId || !companyId || !toPhone || !text) {
    return res.status(400).json({ ok: false, error: "missing fields" });
  }

  try {
    // ✅ idempotência: 1 message_log por outbox_id
    const r = await pool.query(
      `
      insert into message_logs (
        company_id,
        outbox_id,
        channel,
        provider,
        to_phone,
        message_type,
        body,
        status,
        created_at
      ) values (
        $1, $2, 'whatsapp', $3, $4, 'text', $5, 'queued', now()
      )
      on conflict do nothing
      returning id;
      `,
      [companyId, outboxId, provider, toPhone, text],
    );

    if (r.rowCount === 0) {
      logInfo("idempotency hit", { outboxId });
      return res.json({ ok: true, skipped: true });
    }

    let resp;
    if (provider === "mock") {
      resp = await sendMock({ companyId, toPhone, text });
    } else {
      throw new Error("provider not implemented");
    }

    await pool.query(
      `
      update message_logs
      set status='sent',
          provider_message_id=$2,
          sent_at=now()
      where id=$1
      `,
      [r.rows[0].id, resp.providerMessageId ?? null],
    );

    logInfo("message sent", { outboxId, messageLogId: r.rows[0].id });
    res.json({ ok: true, providerMessageId: resp.providerMessageId });
  } catch (e: any) {
    logError("send failed", { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  logInfo("whatsapp worker api listening", { port });
});
