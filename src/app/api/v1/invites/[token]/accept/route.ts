import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { invites, profiles, companyUsers } from "@/drizzle/schema";
import { normalizeEmail } from "@/lib/invites";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const db = getDb();
    const admin = supabaseAdmin();

    const { token } = await context.params;
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (name.length < 2) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 },
      );
    }

    const inviteRows = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.token, token),
          eq(invites.status, "pending"),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const invite = inviteRows[0];

    if (!invite) {
      return NextResponse.json(
        { error: "Convite inválido ou expirado" },
        { status: 404 },
      );
    }

    const email = normalizeEmail(invite.email);

    const createdUserResult = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (createdUserResult.error || !createdUserResult.data.user) {
      return NextResponse.json(
        {
          error:
            createdUserResult.error?.message ??
            "Falha ao criar usuário no Supabase Auth",
        },
        { status: 400 },
      );
    }

    const authUser = createdUserResult.data.user;

    try {
      await db.insert(profiles).values({
        id: authUser.id,
        tenantId: invite.tenantId ?? null,
        companyId: invite.companyId,
        role: invite.role,
        name,
      });

      await db.insert(companyUsers).values({
        tenantId: invite.tenantId ?? null,
        companyId: invite.companyId,
        userId: authUser.id,
        role: invite.role,
        isActive: true,
        invitedByUserId: invite.invitedByUserId,
      });

      await db
        .update(invites)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedByUserId: authUser.id,
          updatedAt: new Date(),
        })
        .where(eq(invites.id, invite.id));
    } catch (dbError) {
      await admin.auth.admin.deleteUser(authUser.id);
      throw dbError;
    }

    return NextResponse.json({
      ok: true,
      message: "Convite aceito com sucesso",
    });
  } catch (error) {
    console.error("[POST /api/v1/invites/[token]/accept]", error);

    return NextResponse.json(
      { error: "Falha ao aceitar convite" },
      { status: 500 },
    );
  }
}
