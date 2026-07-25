import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`select 1 as ok`);

    return NextResponse.json(
      { ok: true, ready: true, ts: new Date().toISOString() },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        error: "db_unavailable",
        message: err?.message ?? "DB unavailable",
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
