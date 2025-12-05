import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { professionals } from "@/drizzle/schema";
import { buildSearch } from "@/lib/buildSearch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const searchCondition = buildSearch(search, [
      professionals.name,
      professionals.specialty,
    ]);

    const rows = searchCondition
      ? await db.select().from(professionals).where(searchCondition)
      : await db.select().from(professionals);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /professionals error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar profissionais" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, specialty, status, avgDuration, companyId, photoUrl } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(professionals)
      .values({
        name,
        specialty: specialty ?? null,
        status: status ?? "ACTIVE",
        avgDuration: avgDuration ?? 20,
        companyId: companyId ?? null,
        photoUrl: photoUrl ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /professionals error:", error);
    return NextResponse.json(
      { error: "Erro ao criar profissional" },
      { status: 500 }
    );
  }
}
