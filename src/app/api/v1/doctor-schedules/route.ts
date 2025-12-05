import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorSchedules } from "@/drizzle/schema";
import { z } from "zod";

const Schema = z.object({
  doctorId: z.string().uuid(),
  weekday: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

export async function GET() {
  const data = await db
    .select()
    .from(doctorSchedules)
    .orderBy(doctorSchedules.weekday);

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = Schema.parse(body);

    const created = await db.insert(doctorSchedules).values(data).returning();

    return NextResponse.json(created[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.errors ?? "Erro ao criar bloco de agenda" },
      { status: 400 }
    );
  }
}
