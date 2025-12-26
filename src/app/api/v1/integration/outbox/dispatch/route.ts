import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import { and, eq, lt, or, isNull } from "drizzle-orm";

function json(ok: boolean, body: any, status = 200) {
  return NextResponse.json({ ok, ...body }, { status });
}
export async function POST(req: Request) {
  // Auth simples para não ficar público
  const secret = req.headers.get("x-outbox-secret");
  if (
    !process.env.N8N_WEBHOOK_SECRET ||
    secret !== process.env.N8N_WEBHOOK_SECRET
  ) {
    return json(false, { error: "unauthorized" }, 401);
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return json(
      false,
      { error: "missing_env", message: "N8N_WEBHOOK_URL não configurada" },
      500
    );
  }

  // Pega eventos prontos para envio (PENDING ou RETRYING já vencido)
  const rows = await db
    .select()
    .from(outbox)
    .where(
      or(
        eq(outbox.status, "PENDING"),
        and(
          eq(outbox.status, "RETRYING"),
          or(isNull(outbox.nextRetryAt), lt(outbox.nextRetryAt, new Date()))
        )
      )
    )
    .limit(10);

  let sent = 0;
  let failed = 0;

  for (const evt of rows) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // segredo que o n8n pode validar também (opcional no workflow)
          "x-sisag-secret": process.env.N8N_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          id: evt.id,
          aggregateType: evt.aggregateType,
          aggregateId: evt.aggregateId,
          eventType: evt.eventType,
          payload: evt.payload,
          attempts: evt.attempts ?? 0,
          createdAt: evt.createdAt,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`webhook_failed_status=${res.status} body=${text}`);
      }

      await db
        .update(outbox)
        .set({
          status: "SENT",
          lastError: null,
          updatedAt: new Date(),
          nextRetryAt: null,
        })
        .where(eq(outbox.id, evt.id));

      sent++;
    } catch (err: any) {
      failed++;

      const attempts = (evt.attempts ?? 0) + 1;
      const delayMinutes =
        attempts <= 1 ? 1 : attempts === 2 ? 5 : attempts === 3 ? 15 : 60;
      const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await db
        .update(outbox)
        .set({
          status: attempts >= 10 ? "DEAD" : "RETRYING",
          attempts,
          lastError: String(err?.message ?? err),
          nextRetryAt,
          updatedAt: new Date(),
        })
        .where(eq(outbox.id, evt.id));
    }
  }

  return json(true, { total: rows.length, sent, failed });
}
