// src/app/api/v1/integration/whatsapp/mock-send/route.ts

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { messageLogs } from "@/drizzle/schema";
import fs from "node:fs";

export const runtime = "nodejs"; // garante Node runtime (sem edge)

function json(ok: boolean, body: any, status = 200) {
  return NextResponse.json({ ok, ...body }, { status });
}

// 🔐 leitura robusta de secret (env OU file)
function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function getInternalSecret(): string | null {
  // 1) Swarm secret
  const fromFile = readSecret(process.env.SISAG_INTERNAL_SECRET_FILE);
  if (fromFile) return fromFile;

  // 2) Env direta (fallback)
  if (process.env.SISAG_INTERNAL_SECRET) {
    return process.env.SISAG_INTERNAL_SECRET;
  }

  return null;
}

export async function POST(req: Request) {
  const expected = getInternalSecret();
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

  // ID previsível e rastreável
  const providerMessageId = `mock_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}`;

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

  return json(true, {
    provider: "mock",
    providerMessageId,
  });
}
