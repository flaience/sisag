import { NextResponse } from "next/server";
import fs from "fs";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { outbox } from "@/drizzle/schema";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function getDispatchToken() {
  return (
    readSecret(process.env.OUTBOX_DISPATCH_TOKEN_FILE) ??
    process.env.OUTBOX_DISPATCH_TOKEN ??
    ""
  );
}

function short(str: string, max = 900) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "...";
}

async function postToN8n(payload: unknown) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) throw new Error("N8N_WEBHOOK_URL is missing");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const bodyText = await resp.text().catch(() => "");
    return { ok: resp.ok, status: resp.status, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const auth = req.headers.get("authorization") || "";
    const token = getDispatchToken();

    if (!token || auth !== `Bearer ${token}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const db = getDb();
    const now = new Date();

    console.log("[OUTBOX] dispatch start", { now: now.toISOString() });

    const events = await db
      .select()
      .from(outbox)
      .where(
        or(
          eq(outbox.status, "pending"),
          and(
            eq(outbox.status, "retrying"),
            or(isNull(outbox.nextRetryAt), lt(outbox.nextRetryAt, now))
          )
        )
      )
      .limit(10);

    console.log("[OUTBOX] selected", { total: events.length });

    let sent = 0;
    let failed = 0;

    for (const evt of events) {
      try {
        // você pode adaptar o payload para o formato que o n8n espera
        const payload = {
          id: evt.id,
          aggregateType: evt.aggregateType,
          aggregateId: evt.aggregateId,
          eventType: evt.eventType,
          payload: evt.payload,
          createdAt: evt.createdAt,
        };

        const r = await postToN8n(payload);

        if (!r.ok) {
          failed++;
          const msg = `webhook_failed_status=${r.status} body=${short(
            r.bodyText
          )}`;
          await db
            .update(outbox)
            .set({
              attempts: (evt.attempts ?? 0) + 1,
              lastError: msg,
              status: "retrying",
              updatedAt: new Date(),
            })
            .where(eq(outbox.id, evt.id));
          continue;
        }

        sent++;
        await db
          .update(outbox)
          .set({
            status: "sent",
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(outbox.id, evt.id));
      } catch (e: any) {
        failed++;
        const msg = short(
          e?.name === "AbortError"
            ? "webhook_timeout"
            : `dispatch_error=${e?.message ?? String(e)}`
        );

        await db
          .update(outbox)
          .set({
            attempts: (evt.attempts ?? 0) + 1,
            lastError: msg,
            status: "retrying",
            updatedAt: new Date(),
          })
          .where(eq(outbox.id, evt.id));
      }
    }

    const ms = Date.now() - startedAt;
    console.log("[OUTBOX] done", { total: events.length, sent, failed, ms });

    return NextResponse.json({ ok: true, total: events.length, sent, failed });
  } catch (e: any) {
    console.error("[OUTBOX] fatal", e?.message ?? e);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
