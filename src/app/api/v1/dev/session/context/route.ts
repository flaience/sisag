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
    const companyId = params.get("companyId") ?? "";
    const clientId = params.get("clientId") ?? "";

    if (!companyId || !clientId) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          required: ["companyId", "clientId"],
        },
        { status: 400 },
      );
    }

    const db = getDb();

    const r = await db.execute(sql`
      select
        id,
        status,
        context,
        updated_at as "updatedAt"
      from conversation_sessions
      where company_id = ${companyId}::uuid
        and client_id = ${clientId}::uuid
      order by updated_at desc
      limit 1;
    `);

    const row = (r as any)?.rows?.[0];

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "session_not_found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        sessionId: row.id,
        status: row.status,
        context: row.context,
        updatedAt: row.updatedAt,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
