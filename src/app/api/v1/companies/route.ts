//src/app/api/v1/companies/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { companies } from "@/drizzle/schema";
import { buildSearch } from "@/lib/buildSearch";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";

    const db = getDb();

    const searchCondition = buildSearch(search, [
      companies.name,
      companies.documentNumber,
      companies.email,
      companies.phone,
    ]);

    const rows = searchCondition
      ? await db.select().from(companies).where(searchCondition)
      : await db.select().from(companies);

    return NextResponse.json({
      ok: true,
      items: rows,
    });
  } catch (error: any) {
    console.error("GET /api/v1/companies error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao buscar empresas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, document, phone, email, address } = body ?? {};

    if (!name?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "name_required",
          message: "Name é obrigatório.",
        },
        { status: 400 },
      );
    }

    const db = getDb();

    const [created] = await db
      .insert(companies)
      .values({
        name: name.trim(),
        documentNumber: document?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
      })
      .returning();

    return NextResponse.json(
      {
        ok: true,
        item: created,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/v1/companies error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao criar empresa.",
      },
      { status: 500 },
    );
  }
}
