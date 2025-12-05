// GET /api/v1/scheduling/available?professionalId=xxx&date=2025-01-01
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  schedulingConfig,
  appointments,
  professionalSchedules,
} from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const professionalId = searchParams.get("professionalId");
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!professionalId || !date) {
    return NextResponse.json(
      { ok: false, message: "Parâmetros obrigatórios ausentes." },
      { status: 400 }
    );
  }

  // -------------------------------
  // 1) Carrega config
  // -------------------------------
  const cfg = (await db.select().from(schedulingConfig).limit(1))[0];

  if (!cfg) {
    return NextResponse.json(
      { ok: false, message: "Configuração de agendamento não encontrada." },
      { status: 500 }
    );
  }

  // -------------------------------
  // 2) Carrega horários fixos do profissional
  // -------------------------------
  const weekday = new Date(date).getDay();

  const schedules = await db
    .select()
    .from(professionalSchedules)
    .where(
      and(
        eq(professionalSchedules.professionalId, professionalId),
        eq(professionalSchedules.weekday, weekday)
      )
    );

  if (schedules.length === 0) {
    return NextResponse.json([]);
  }

  // -------------------------------
  // 3) Carrega marcações existentes
  // -------------------------------
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const existing = await db
    .select({
      scheduledTime: appointments.scheduledTime,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.professionalId, professionalId),
        and(
          gte(appointments.scheduledTime, dayStart),
          lte(appointments.scheduledTime, dayEnd)
        )
      )
    );

  const existingTimes = new Set(
    existing.map((a) => a.scheduledTime.toISOString().substring(11, 16))
  );

  const slot = cfg.slotDurationMinutes;
  const buffer = cfg.bufferMinutes;
  const allowOverbooking = cfg.allowOverbooking;

  // -------------------------------
  // 4) Gera horários
  // -------------------------------
  const available: string[] = [];

  for (const sch of schedules) {
    let current = toMinutes(sch.startTime);
    const end = toMinutes(sch.endTime);

    while (current + slot <= end) {
      const hhmm = minutesToHHMM(current);
      current += slot + buffer;

      if (!allowOverbooking && existingTimes.has(hhmm)) continue;

      available.push(hhmm);
    }
  }

  return NextResponse.json(available);
}

// AUXILIARES
function toMinutes(str: string) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(min: number) {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
