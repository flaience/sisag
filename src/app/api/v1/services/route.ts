import { NextResponse } from "next/server";
import { asc, eq, ilike, and } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { services } from "@/drizzle/schema";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("companyId")?.trim() ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    const db = getDb();

    const filters = [];

    // remova este bloco se a tabela services não tiver companyId
    if (companyId) {
      filters.push(eq(services.companyId, companyId));
    }

    if (search) {
      filters.push(ilike(services.name, `%${search}%`));
    }

    const rows =
      filters.length > 0
        ? await db
            .select({
              id: services.id,
              name: services.name,
              durationMinutes: services.durationMinutes,
            })
            .from(services)
            .where(and(...filters))
            .orderBy(asc(services.name))
        : await db
            .select({
              id: services.id,
              name: services.name,
              durationMinutes: services.durationMinutes,
            })
            .from(services)
            .orderBy(asc(services.name));

    return NextResponse.json({
      ok: true,
      items: rows,
    });
  } catch (error: any) {
    console.error("GET /api/v1/services error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: error?.message ?? "Erro ao buscar serviços.",
      },
      { status: 500 },
    );
  }
}
