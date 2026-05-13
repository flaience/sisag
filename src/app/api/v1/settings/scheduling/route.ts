import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { schedulingConfig } from "@/drizzle/schema";
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
      .select()
      .from(schedulingConfig)
      .where(eq(schedulingConfig.companyId, auth.companyId))
      .limit(1);

    return NextResponse.json({
      ok: true,
      config: rows[0] ?? null,
    });
  } catch (error) {
    console.error("[GET /api/v1/settings/scheduling]", error);

    return NextResponse.json(
      { error: "Falha ao carregar configurações de agenda" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiRole(request, ["owner", "admin"]);

    if (authResult.ok === false) {
      return authResult.response;
    }

    const { auth } = authResult;
    const db = getDb();

    const body = await request.json();

    const slotDurationMinutes = Number(body.slotDurationMinutes ?? 15);
    const bufferMinutes = Number(body.bufferMinutes ?? 5);
    const maxAdvanceDays = Number(body.maxAdvanceDays ?? 30);
    const minCancelAdvanceMinutes = Number(body.minCancelAdvanceMinutes ?? 0);

    const existingRows = await db
      .select()
      .from(schedulingConfig)
      .where(eq(schedulingConfig.companyId, auth.companyId))
      .limit(1);

    const existing = existingRows[0];

    if (!existing) {
      const inserted = await db
        .insert(schedulingConfig)
        .values({
          companyId: auth.companyId,
          slotDurationMinutes,
          bufferMinutes,
          maxAdvanceDays,
          minCancelAdvanceMinutes,
        })
        .returning();

      return NextResponse.json({
        ok: true,
        config: inserted[0] ?? null,
      });
    }

    const updated = await db
      .update(schedulingConfig)
      .set({
        slotDurationMinutes,
        bufferMinutes,
        maxAdvanceDays,
        minCancelAdvanceMinutes,
        updatedAt: new Date(),
      })
      .where(eq(schedulingConfig.id, existing.id))
      .returning();

    return NextResponse.json({
      ok: true,
      config: updated[0] ?? null,
    });
  } catch (error) {
    console.error("[PUT /api/v1/settings/scheduling]", error);

    return NextResponse.json(
      { error: "Falha ao salvar configurações de agenda" },
      { status: 500 },
    );
  }
}
