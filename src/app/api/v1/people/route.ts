import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/drizzle/schema";
import { buildSearch } from "@/lib/buildSearch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const searchCondition = buildSearch(search, [
      clients.name,
      clients.phone,
      clients.email,
    ]);

    const rows = searchCondition
      ? await db.select().from(clients).where(searchCondition)
      : await db.select().from(clients);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /people error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pessoas" },
      { status: 500 }
    );
  }
}
