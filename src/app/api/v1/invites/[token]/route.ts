import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { invites, companies } from "@/drizzle/schema";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const db = getDb();
    const { token } = await context.params;

    const rows = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        status: invites.status,
        expiresAt: invites.expiresAt,
        companyId: invites.companyId,
        companyName: companies.name,
      })
      .from(invites)
      .leftJoin(companies, eq(invites.companyId, companies.id))
      .where(
        and(
          eq(invites.token, token),
          eq(invites.status, "pending"),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      return NextResponse.json(
        { error: "Convite inválido ou expirado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      invite: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        companyId: invite.companyId,
        companyName: invite.companyName ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/v1/invites/[token]]", error);

    return NextResponse.json(
      { error: "Falha ao carregar convite" },
      { status: 500 },
    );
  }
}
