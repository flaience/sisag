import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { companies } from "@/drizzle/schema";
import { requireApiRole } from "@/lib/auth/apiAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireApiRole(request, ["owner"]);

    if (authResult.ok === false) {
      return authResult.response;
    }

    const { auth } = authResult;
    const { id } = await context.params;
    const db = getDb();

    const rows = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    const company = rows[0];

    if (!company || company.id !== auth.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      company,
    });
  } catch (error) {
    console.error("[GET /api/v1/companies/[id]]", error);

    return NextResponse.json(
      { error: "Falha ao carregar empresa" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireApiRole(request, ["owner"]);

    if (authResult.ok === false) {
      return authResult.response;
    }

    const { auth } = authResult;
    const { id } = await context.params;
    const db = getDb();
    const body = await request.json();

    if (id !== auth.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db
      .update(companies)
      .set({
        name: String(body.name ?? ""),
        documentNumber: String(body.documentNumber ?? ""),
        address: String(body.address ?? ""),
        phone: String(body.phone ?? ""),
        email: String(body.email ?? ""),
        businessType: String(body.businessType ?? "generic"),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    return NextResponse.json({
      ok: true,
      company: updated[0] ?? null,
    });
  } catch (error) {
    console.error("[PUT /api/v1/companies/[id]]", error);

    return NextResponse.json(
      { error: "Falha ao atualizar empresa" },
      { status: 500 },
    );
  }
}
