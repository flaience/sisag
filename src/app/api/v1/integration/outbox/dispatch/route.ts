// src/app/api/v1/integration/outbox/dispatch/route.ts

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";
import { and, eq, lt, or, isNull } from "drizzle-orm";
import fs from "fs";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function json(ok: boolean, body: any, status = 200) {
  return NextResponse.json({ ok, ...body }, { status });
}

export async function POST(req: Request) {
  // ✅ Token interno (Bearer)
  const token =
    readSecret(process.env.OUTBOX_DISPATCH_TOKEN_FILE) ??
    process.env.OUTBOX_DISPATCH_TOKEN;

  const auth = req.headers.get("authorization") || "";
  if (!token || auth !== `Bearer ${token}`) {
    return json(false, { error: "unauthorized" }, 401);
  }

  // (opcional) se você ainda quer manter o x-outbox-secret, mantenha, mas NÃO precisa
  // const secret = req.headers.get("x-outbox-secret");
  // if (!process.env.N8N_WEBHOOK_SECRET || secret !== process.env.N8N_WEBHOOK_SECRET) {
  //   return json(false, { error: "unauthorized" }, 401);
  // }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return json(
      false,
      { error: "missing_env", message: "N8N_WEBHOOK_URL não configurada" },
      500
    );
  }

  const db = getDb();

  const rows = await db
    .select()
    .from(outbox)
    .where(
      or(
        eq(outbox.status, "pending"),
        and(
          eq(outbox.status, "retrying"),
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
          "x-sisag-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
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
          status: attempts >= 10 ? "dead" : "retrying",
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
