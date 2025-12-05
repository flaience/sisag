// src/app/api/v1/integration/webhook/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Normaliza evento externo
    const event = {
      id: uuidv4(),
      source: "external_webhook",
      receivedAt: new Date().toISOString(),
      payload: body,
    };

    // Insere no OUTBOX (para workers processarem)
    await db.execute(sql`
      INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
      VALUES ('webhook', ${event.id}::uuid, 'received', ${event}::jsonb)
    `);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json(
      { error: e.message || "Erro interno" },
      { status: 500 }
    );
  }
}
