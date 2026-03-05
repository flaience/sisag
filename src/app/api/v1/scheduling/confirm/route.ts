//src/app/api/v1/scheduling/confirm/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { requireSchedulingKey } from "@/lib/api-auth";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const deny = requireSchedulingKey(req);
  if (deny) return deny;
  try {
    const body = await req.json().catch(() => ({}));

    const companyId = String(body?.companyId ?? "");
    const clientId = String(body?.clientId ?? "");
    const bookingId = String(body?.bookingId ?? "");

    if (!companyId || !clientId || !bookingId) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          required: ["companyId", "clientId", "bookingId"],
        },
        { status: 400 },
      );
    }
    if (
      !uuidRe.test(companyId) ||
      !uuidRe.test(clientId) ||
      !uuidRe.test(bookingId)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_uuid" },
        { status: 400 },
      );
    }

    const db = getDb();

    // confirma apenas se estiver PENDING
    const r = await db.execute(sql`
      update bookings
      set status = 'CONFIRMED', updated_at = now()
      where id = ${bookingId}::uuid
        and company_id = ${companyId}::uuid
        and client_id = ${clientId}::uuid
        and status = 'PENDING'
      returning id;
    `);

    const updated = (r as any)?.rows?.length ?? 0;

    if (updated === 0) {
      return NextResponse.json(
        { ok: false, error: "not_found_or_not_pending" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
