import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";

function json(ok: boolean, body: any, status = 200) {
  return NextResponse.json({ ok, ...body }, { status });
}

export const runtime = "nodejs"; // garante Node runtime (sem edge)

export async function POST(req: Request) {
  const expected = process.env.N8N_WEBHOOK_SECRET || "";
  const got = req.headers.get("x-sisag-secret") || "";

  if (!expected || got !== expected) {
    return json(false, { error: "unauthorized" }, 401);
  }

  const data = await req.json().catch(() => null);

  const companyId = data?.companyId as string | undefined;
  const toPhone = data?.toPhone as string | undefined;
  const text = data?.text as string | undefined;

  if (!companyId || !toPhone || !text) {
    return json(
      false,
      { error: "missing_fields", required: ["companyId", "toPhone", "text"] },
      400,
    );
  }

  const db = getDb();

  // evita depender de crypto global
  const providerMessageId = `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  await db.insert(messageLogs).values({
    companyId,
    channel: "whatsapp",
    provider: "mock",
    toPhone,
    body: text,
    status: "sent",
    providerMessageId,
    createdAt: new Date(),
  });

  return json(true, { provider: "mock", providerMessageId });
}
