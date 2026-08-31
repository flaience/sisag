import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { schedulingConfig } from "@/drizzle/schema";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { SchedulingConfigInputSchema } from "@/modules/scheduling-config/scheduling-config.schema";
import { SchedulingDefaultsError, validateSchedulingDefaults } from "@/modules/scheduling-config/SchedulingDefaults.service";

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

    const parsed = SchedulingConfigInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_scheduling_config",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const config = parsed.data;
    await validateSchedulingDefaults(auth.companyId, config);

    const saved = await db
      .insert(schedulingConfig)
      .values({
        companyId: auth.companyId,
        ...config,
      })
      .onConflictDoUpdate({
        target: schedulingConfig.companyId,
        set: {
          ...config,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      ok: true,
      config: saved[0] ?? null,
    });
  } catch (error) {
    if (error instanceof SchedulingDefaultsError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: 400 });
    }
    console.error("[PUT /api/v1/settings/scheduling]", error);

    return NextResponse.json(
      { error: "Falha ao salvar configurações de agenda" },
      { status: 500 },
    );
  }
}
