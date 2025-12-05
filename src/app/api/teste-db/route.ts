import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.execute(sql`select now() as time`);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("DB TEST ERROR:", err);
    return NextResponse.json({ error: "DB falhou" }, { status: 500 });
  }
}
