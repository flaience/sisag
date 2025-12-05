// GET /api/v1/people/search?q=jo
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients } from "@/drizzle/schema";
import { ilike } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
    })
    .from(clients)
    .where(ilike(clients.name, `%${q}%`));

  return NextResponse.json(rows);
}
