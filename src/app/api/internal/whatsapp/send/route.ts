//src/app/api/internal/whatsapp/send/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { readEnv } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const expectedSecret = readEnv("SISAG_INTERNAL_SECRET");

    if (!expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 },
      );
    }

    const gotSecret =
      req.headers.get("x-internal-secret") ||
      req.headers.get("X-Internal-Secret") ||
      "";

    if (!gotSecret || gotSecret !== expectedSecret) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const companyId = String(body?.companyId ?? "");
    const toPhone = String(body?.toPhone ?? "");
    const text = String(body?.text ?? "");

    if (!companyId || !toPhone || !text) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          required: ["companyId", "toPhone", "text"],
        },
        { status: 400 },
      );
    }

    const db = getDb();

    const payload = {
      companyId,
      toPhone,
      text,
    };

    const aggregateId = randomUUID();

    const r = await db.execute(sql`
      insert into outbox (
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        status,
        attempts,
        created_at,
        updated_at
      )
      values (
        'whatsapp_message',
        ${aggregateId}::uuid,
        'whatsapp.send.requested',
        ${JSON.stringify(payload)}::jsonb,
        'pending',
        0,
        now(),
        now()
      )
      returning id;
    `);

    const outboxId = (r as any)?.rows?.[0]?.id;

    return NextResponse.json(
      { ok: true, outboxId, aggregateId },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Error",
      },
      { status: 500 },
    );
  }
}
