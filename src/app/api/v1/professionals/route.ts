//src/app/api/v1/professionals/route.ts
import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { professionals } from "@/drizzle/schema";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("companyId") ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    const db = getDb();

    const filters = [];

    if (companyId) {
      filters.push(eq(professionals.companyId, companyId));
    }

    if (search) {
      filters.push(
        or(
          ilike(professionals.name, `%${search}%`),
          ilike(professionals.specialty, `%${search}%`),
        )!,
      );
    }

    const rows = await db
      .select({
        id: professionals.id,
        companyId: professionals.companyId,
        name: professionals.name,
        specialty: professionals.specialty,
        resourceId: professionals.resourceId,
        createdAt: professionals.createdAt,
        updatedAt: professionals.updatedAt,
      })
      .from(professionals)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(professionals.createdAt));

    return NextResponse.json({
      ok: true,
      items: rows,
    });
  } catch (err: any) {
    console.error("GET /api/v1/professionals error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro ao buscar profissionais.",
      },
      { status: 500 },
    );
  }
}
