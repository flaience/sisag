import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { whatsappAccounts } from "@/drizzle/schema";
import { requireApiRole } from "@/lib/auth/apiAuth";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner"]);

    if (!authResult.ok) {
      return authResult.response;
    }

    const { auth } = authResult;
    const db = getDb();

    const rows = await db
      .select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.companyId, auth.companyId));

    return NextResponse.json({
      ok: true,
      accounts: rows,
    });
  } catch (error) {
    console.error("[GET /api/v1/settings/whatsapp]", error);

    return NextResponse.json(
      { error: "Falha ao carregar contas de WhatsApp" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner"]);

    if (!authResult.ok) {
      return authResult.response;
    }

    const { auth } = authResult;
    const db = getDb();
    const body = await request.json();

    const accountId = String(body.accountId ?? "");
    const provider = String(body.provider ?? "");
    const status = String(body.status ?? "pending");
    const providerConfig = body.providerConfig ?? {};

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId é obrigatório" },
        { status: 400 },
      );
    }

    const updated = await db
      .update(whatsappAccounts)
      .set({
        provider,
        status,
        providerConfig,
        updatedAt: new Date(),
      })
      .where(eq(whatsappAccounts.id, accountId))
      .returning();

    return NextResponse.json({
      ok: true,
      account: updated[0] ?? null,
    });
  } catch (error) {
    console.error("[PUT /api/v1/settings/whatsapp]", error);

    return NextResponse.json(
      { error: "Falha ao atualizar configuração de WhatsApp" },
      { status: 500 },
    );
  }
}
