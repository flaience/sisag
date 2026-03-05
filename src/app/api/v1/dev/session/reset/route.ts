import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.companyId ?? "");
    const clientId = String(body?.clientId ?? "");

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
      update conversation_sessions
      set context = '{}'::jsonb,
          updated_at = now()
      where company_id = ${companyId}::uuid
        and client_id = ${clientId}::uuid
        and status = 'open'
      returning id;
    `);

    const updated = (r as any)?.rows?.length ?? 0;

    return NextResponse.json({ ok: true, updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
