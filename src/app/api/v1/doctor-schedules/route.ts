import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { professionalSchedules } from "@/drizzle/schema";
import { z } from "zod";

const Schema = z.object({
  doctorId: z.string().uuid(),
  weekday: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export async function GET() {
  const db = getDb();
  const data = await db
    .select()
    .from(professionalSchedules)
    .orderBy(professionalSchedules.weekday);

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();

    const professionalId = body.professionalId ?? body.doctorId;
    const weekday = body.weekday;
    const startTime = body.startTime;
    const endTime = body.endTime;

    if (
      !professionalId ||
      typeof professionalId !== "string" ||
      typeof weekday !== "number" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "professionalId, weekday, startTime e endTime são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const created = await db
      .insert(professionalSchedules)
      .values({
        professionalId,
        weekday,
        startTime,
        endTime,
      })
      .returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro ao criar agenda do profissional.",
      },
      { status: 500 },
    );
  }
}
