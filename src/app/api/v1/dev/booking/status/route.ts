import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }

    const params = new URL(req.url).searchParams;
    const bookingId = params.get("bookingId") ?? "";

    if (!bookingId) {
      return NextResponse.json(
        { ok: false, error: "missing_bookingId" },
        { status: 400 },
      );
    }

    const db = getDb();
    const r = await db.execute(sql`
      select id, status, start_time as "startTime", updated_at as "updatedAt"
      from bookings
      where id = ${bookingId}::uuid
      limit 1;
    `);

    const row = (r as any)?.rows?.[0];
    if (!row)
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );

    return NextResponse.json({ ok: true, row }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
