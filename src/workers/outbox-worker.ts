//src/workers/outbox-worker.ts
import { pool } from "@/lib/db";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function processOutbox() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Pega 1 evento não processado (paralelo seguro)
    const { rows } = await client.query(`
      SELECT *
      FROM outbox
      WHERE status IN ('PENDING', 'RETRYING')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1;
    `);

    if (rows.length === 0) {
      await client.query("COMMIT");
      return; // nada para fazer
    }

    const event = rows[0];

    console.log("📤 Processando evento OUTBOX:", event.id, event.event_type);

    try {
      //
      // >>>>>>>>>>>> AQUI ENTRA SUA LÓGICA DE ENTREGA <<<<<<<<<<<<<<<
      //
      // Ex.: enviar para WhatsApp, enviar para n8n, publicar em webhook
      //

      // ----------- Exemplo: enviar para n8n webhook ---------------
      await fetch("https://SEU_N8N/webhook/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event.payload),
      });

      // -------------------------------------------------------------

      await client.query(
        `
        UPDATE outbox
        SET status='SENT', attempts=attempts+1, updated_at=now()
        WHERE id=$1
        `,
        [event.id]
      );

      await client.query("COMMIT");
      console.log("✔ Evento enviado com sucesso:", event.id);
    } catch (deliverError: any) {
      console.error("❌ Erro entregando evento:", deliverError);

      const attempts = event.attempts + 1;
      const maxAttempts = 5;

      if (attempts >= maxAttempts) {
        // DEAD LETTER
        await client.query(
          `
          UPDATE outbox
          SET status='DEAD', attempts=$2, last_error=$3, updated_at=now()
          WHERE id=$1
        `,
          [event.id, attempts, deliverError?.message || String(deliverError)]
        );

        await client.query("COMMIT");
        console.error("⚠ Evento movido para DEAD LETTER:", event.id);
      } else {
        // retry com backoff exponencial
        const nextRetry = new Date(Date.now() + attempts * 30000); // 30s * tentativas

        await client.query(
          `
          UPDATE outbox
          SET status='RETRYING',
              attempts=$2,
              last_error=$3,
              next_retry_at=$4,
              updated_at=now()
          WHERE id=$1
        `,
          [
            event.id,
            attempts,
            deliverError?.message || String(deliverError),
            nextRetry,
          ]
        );

        await client.query("COMMIT");
        console.log("⏳ Reagendado para retry:", nextRetry);
      }
    }
  } catch (err) {
    console.error("FATAL:", err);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

// Execute a cada 3 segundos
console.log("🚀 Outbox Worker iniciado...");
setInterval(processOutbox, 3000);
