//src/app/api/v1/scheduling/config/route.ts
import { db } from "@/lib/db";
import { schedulingConfig, companies } from "@/drizzle/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await db.select().from(schedulingConfig).limit(1);
    return NextResponse.json(rows[0] ?? null);
  } catch (e) {
    console.error("ERROR GET scheduling/config:", e);
    return NextResponse.json(
      { error: "Erro ao buscar config" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // (1) buscar empresa padrão (a primeira)
    const [company] = await db.select().from(companies).limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Nenhuma empresa encontrada." },
        { status: 400 }
      );
    }

    // (2) buscar config existente
    const existing = await db.select().from(schedulingConfig).limit(1);

    let saved;

    if (existing.length === 0) {
      // INSERIR
      const [row] = await db
        .insert(schedulingConfig)
        .values({
          companyId: company.id,
          slotDurationMinutes: body.slotDurationMinutes,
          bufferMinutes: body.bufferMinutes,
          allowOverbooking: body.allowOverbooking,
          maxAdvanceDays: body.maxAdvanceDays,
        })
        .returning();
      saved = row;
    } else {
      // ALTERAR
      const [row] = await db
        .update(schedulingConfig)
        .set({
          slotDurationMinutes: body.slotDurationMinutes,
          bufferMinutes: body.bufferMinutes,
          allowOverbooking: body.allowOverbooking,
          maxAdvanceDays: body.maxAdvanceDays,
        })
        .returning();
      saved = row;
    }

    return NextResponse.json(saved);
  } catch (e) {
    console.error("ERROR POST scheduling/config:", e);
    return NextResponse.json(
      { error: "Erro ao salvar configuração" },
      { status: 500 }
    );
  }
}
