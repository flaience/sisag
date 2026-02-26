//src/app/api/v1/dev/whatsapp/simulate-status/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  messageLogs,
  whatsappMessageStatusEvents,
  whatsappAccounts,
} from "@/drizzle/schema";

type Status = "sent" | "delivered" | "read" | "failed";

export async function GET() {
  return NextResponse.json({ ok: true, route: "simulate-status" });
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const providerMessageId = body.providerMessageId as string;
    const status = body.status as Status;
    const inputTimestampMs = body.timestampMs as number | undefined;

    // ✅ salva em "segundos" para caber no integer do Postgres
    let timestampSafe = inputTimestampMs ?? Date.now();

    // se vier em ms (13 dígitos), converte pra segundos
    if (timestampSafe > 2_147_483_647) {
      timestampSafe = Math.floor(timestampSafe / 1000);
    }

    if (!providerMessageId || !status) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    // 1) acha o message_log
    const rows = await db
      .select({
        id: messageLogs.id,
        companyId: messageLogs.companyId,
        whatsappAccountId: messageLogs.whatsappAccountId,
        provider: messageLogs.provider,
        providerMessageId: messageLogs.providerMessageId,
      })
      .from(messageLogs)
      .where(eq(messageLogs.providerMessageId, providerMessageId))
      .limit(1);

    const msg = rows[0];
    if (!msg) {
      return NextResponse.json(
        { ok: false, error: "message_log_not_found" },
        { status: 404 },
      );
    }

    // 2) grava evento de status (audit trail)
    await db.insert(whatsappMessageStatusEvents).values({
      companyId: msg.companyId,
      whatsappAccountId: msg.whatsappAccountId,
      messageLogId: msg.id,
      provider: msg.provider,
      providerMessageId,
      status,
      timestampMs: timestampSafe,
      rawPayload: {
        simulated: true,
        status,
        providerMessageId,
        // preserva o valor original (ms) aqui:
        inputTimestampMs: inputTimestampMs ?? null,
        storedTimestamp: timestampSafe,
      },
    });

    // 3) atualiza message_logs timestamps/status
    const now = new Date();

    const patch: any = { status };

    if (status === "sent") patch.sentAt = now;
    if (status === "delivered") patch.deliveredAt = now;
    if (status === "read") patch.readAt = now;
    if (status === "failed") patch.failedAt = now;

    await db.update(messageLogs).set(patch).where(eq(messageLogs.id, msg.id));

    return NextResponse.json({ ok: true, messageLogId: msg.id, status });
  } catch (err: any) {
    console.error("SIMULATE STATUS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
