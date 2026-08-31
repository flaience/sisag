import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { clients } from "@/drizzle/schema";
import { buildSearch } from "@/lib/buildSearch";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
    if (auth.ok === false) return auth.response;
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    const text = buildSearch(search, [clients.name, clients.phoneE164, clients.email]);
    const condition = text ? and(eq(clients.companyId, auth.auth.companyId), text) : eq(clients.companyId, auth.auth.companyId);
    const rows = await getDb().select().from(clients).where(condition);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /people error:", error);
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 });
  }
}
