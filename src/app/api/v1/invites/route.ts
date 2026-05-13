import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { invites } from "@/drizzle/schema";
import {
  generateInviteToken,
  getInviteExpiration,
  normalizeEmail,
} from "@/lib/invites";
import { requireApiRole } from "@/lib/auth/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);

    if (authResult.ok === false) {
      return authResult.response;
    }

    const { auth } = authResult;
    const db = getDb();

    const rows = await db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        status: invites.status,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        invitedByUserId: invites.invitedByUserId,
        acceptedAt: invites.acceptedAt,
        revokedAt: invites.revokedAt,
        token: invites.token,
      })
      .from(invites)
      .where(eq(invites.companyId, auth.companyId))
      .orderBy(desc(invites.createdAt));

    return NextResponse.json({
      ok: true,
      invites: rows.map((invite) => ({
        ...invite,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`,
      })),
    });
  } catch (error) {
    console.error("[GET /api/v1/invites]", error);

    return NextResponse.json(
      { error: "Falha ao listar convites" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);

    if (authResult.ok === false) {
      return authResult.response;
    }
    const { auth } = authResult;
    const db = getDb();

    const body = await request.json();

    const email = normalizeEmail(String(body.email ?? ""));
    const requestedRole = String(body.role ?? "staff") as
      | "owner"
      | "admin"
      | "staff";

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    if (!["owner", "admin", "staff"].includes(requestedRole)) {
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    }

    if (auth.role === "admin" && requestedRole !== "staff") {
      return NextResponse.json(
        { error: "Admin só pode convidar staff" },
        { status: 403 },
      );
    }

    const pendingInvites = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.companyId, auth.companyId),
          eq(invites.email, email),
          eq(invites.status, "pending"),
        ),
      );

    for (const pending of pendingInvites) {
      await db
        .update(invites)
        .set({
          status: "revoked",
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invites.id, pending.id));
    }

    const token = generateInviteToken();
    const expiresAt = getInviteExpiration(7);

    const inserted = await db
      .insert(invites)
      .values({
        tenantId: auth.tenantId,
        companyId: auth.companyId,
        email,
        role: requestedRole,
        token,
        expiresAt,
        invitedByUserId: auth.userId,
      })
      .returning();

    const createdInvite = inserted[0];

    if (!createdInvite) {
      return NextResponse.json(
        { error: "Falha ao criar convite" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      invite: {
        id: createdInvite.id,
        email: createdInvite.email,
        role: createdInvite.role,
        expiresAt: createdInvite.expiresAt,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${createdInvite.token}`,
      },
    });
  } catch (error) {
    console.error("[POST /api/v1/invites]", error);

    return NextResponse.json(
      { error: "Falha ao criar convite" },
      { status: 500 },
    );
  }
}
