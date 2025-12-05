import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companies } from "@/drizzle/schema";
import { buildSearch } from "@/lib/buildSearch";
import { Phone } from "lucide-react";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    // campos-chave da busca
    const searchCondition = buildSearch(search, [
      companies.name,
      companies.document,
      companies.email,
      companies.phone,
    ]);

    const rows = searchCondition
      ? await db.select().from(companies).where(searchCondition)
      : await db.select().from(companies);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /companies error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empresas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, document, phone, email, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name é obrigatório" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(companies)
      .values({
        name,
        document: document ?? null,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /companies error:", error);
    return NextResponse.json(
      { error: "Erro ao criar empresa" },
      { status: 500 }
    );
  }
}
