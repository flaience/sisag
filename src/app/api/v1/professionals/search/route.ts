// GET /api/v1/professionals/search?q=jo
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { professionals } from "@/drizzle/schema";
import { and, eq, ilike } from "drizzle-orm";
import { requireApiRole } from "@/lib/auth/apiAuth";

export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
  if (authResult.ok === false) return authResult.response;
  const companyId = authResult.auth.companyId;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }
  const db = getDb();
  const rows = await db
    .select({
      id: professionals.id,
      name: professionals.name,
    })
    .from(professionals)
    .where(and(
      eq(professionals.companyId, companyId),
      ilike(professionals.name, `%${q}%`),
    ));

  return NextResponse.json(rows);
}
