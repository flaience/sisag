// src/app/api/v1/integration/outbox/dispatch/route.ts-v

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

function short(str: string, max = 900) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "...";
}

async function postWithTimeout(
  url: string,
  payload: any,
  headers: Record<string, string>
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  // ✅ Token interno (Bearer)
  const token =
    readSecret(process.env.OUTBOX_DISPATCH_TOKEN_FILE) ??
    process.env.OUTBOX_DISPATCH_TOKEN ??
    "";

  const auth = req.headers.get("authorization") || "";
  if (!token || auth !== `Bearer ${token}`) {
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
      const payload = {
        id: evt.id,
        aggregateType: evt.aggregateType,
        aggregateId: evt.aggregateId,
        eventType: evt.eventType,
        payload: evt.payload,
        attempts: evt.attempts ?? 0,
        createdAt: evt.createdAt,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Se você quiser validar no workflow, mantenha este header.
      // Caso contrário, pode remover (não afeta o Bearer).
      if (process.env.N8N_WEBHOOK_SECRET) {
        headers["x-sisag-secret"] = process.env.N8N_WEBHOOK_SECRET;
      }

      const r = await postWithTimeout(webhookUrl, payload, headers);

      if (!r.ok) {
        throw new Error(
          `webhook_failed_status=${r.status} body=${short(r.text)}`
        );
      }

      await db
        .update(outbox)
        .set({
          status: "sent", // ✅ lowercase
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

      const msg =
        err?.name === "AbortError"
          ? "webhook_timeout"
          : String(err?.message ?? err);

      await db
        .update(outbox)
        .set({
          status: attempts >= 10 ? "dead" : "retrying",
          attempts,
          lastError: short(msg),
          nextRetryAt,
          updatedAt: new Date(),
        })
        .where(eq(outbox.id, evt.id));
    }
  }

  return json(true, { total: rows.length, sent, failed });
}
