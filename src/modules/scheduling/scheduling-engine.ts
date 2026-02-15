// src/modules/scheduling/scheduling-engine.ts
import { getDb } from "@/lib/db";
import {
  schedulingConfig,
  appointments,
  professionalSchedules,
  professionals,
} from "@/drizzle/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { DEFAULT_TIMEZONE } from "@/lib/time";

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

type ValidateSchedulingInput = {
  companyId: string;
  professionalId: string;
  scheduledTimeUtcIso: string; // timestamptz ISO (UTC)
  appointmentIdToIgnore?: string; // usado em reschedule p/ ignorar o próprio
  now?: Date; // opcional (tests)
  timeZone?: string; // opcional (default America/Sao_Paulo)
};

// ✅ Ajustado para bater com seu schema/comentários (lowercase)
const ACTIVE_STATUSES = ["confirmed", "scheduled", "pending"] as const;

export async function validateSchedulingRules(
  input: ValidateSchedulingInput,
): Promise<ValidationResult> {
  const db = getDb();

  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const now = input.now ?? new Date();

  if (!input.companyId || !input.professionalId || !input.scheduledTimeUtcIso) {
    return {
      ok: false,
      error: "missing_fields",
      message:
        "companyId, professionalId e scheduledTimeUtcIso são obrigatórios.",
    };
  }

  const dt = new Date(input.scheduledTimeUtcIso);
  if (Number.isNaN(dt.getTime())) {
    return {
      ok: false,
      error: "invalid_datetime",
      message: "Data/hora inválida.",
    };
  }

  // ✅ normaliza: zera segundos e ms (evita furo no eq do timestamptz)
  dt.setUTCSeconds(0, 0);

  // ✅ garante multi-tenant do profissional
  const prof = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.id, input.professionalId),
        eq(professionals.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!prof.length) {
    return {
      ok: false,
      error: "invalid_professional_company",
      message: "Profissional não pertence a esta empresa.",
    };
  }

  // ✅ config por companyId
  const cfgRow = await db
    .select({
      slotDurationMinutes: schedulingConfig.slotDurationMinutes,
      bufferMinutes: schedulingConfig.bufferMinutes,
      allowOverbooking: schedulingConfig.allowOverbooking,
      maxAdvanceDays: schedulingConfig.maxAdvanceDays,
    })
    .from(schedulingConfig)
    .where(eq(schedulingConfig.companyId, input.companyId))
    .limit(1);

  if (!cfgRow[0]) {
    return {
      ok: false,
      error: "no_config",
      message: "Configuração de agendamento não encontrada.",
    };
  }

  const cfg = cfgRow[0];
  const slot = Number(cfg.slotDurationMinutes ?? 15);
  const buffer = Number(cfg.bufferMinutes ?? 0);
  const allowOverbooking = Boolean(cfg.allowOverbooking ?? false);
  const maxAdvanceDays = Number(cfg.maxAdvanceDays ?? 30);

  // ✅ regra: não pode agendar no passado (nem 1 minuto)
  const diffMinutesFromNow = Math.floor(
    (dt.getTime() - now.getTime()) / 60_000,
  );
  if (diffMinutesFromNow < 0) {
    return {
      ok: false,
      error: "invalid_past",
      message: "Não é possível agendar no passado.",
    };
  }

  // ✅ regra: bufferMinutes (antecedência mínima)
  if (buffer > 0 && diffMinutesFromNow < buffer) {
    return {
      ok: false,
      error: "too_soon",
      message: `Agendamentos precisam de pelo menos ${buffer} minutos de antecedência.`,
    };
  }

  // ✅ regra: maxAdvanceDays (por data LOCAL, não UTC)
  const nowYmd = getLocalYmd(now, timeZone);
  const dtYmd = getLocalYmd(dt, timeZone);
  const diffDays = daysBetweenYmd(nowYmd, dtYmd);

  if (diffDays > maxAdvanceDays) {
    return {
      ok: false,
      error: "max_days",
      message: `Agendamentos com mais de ${maxAdvanceDays} dias de antecedência não são permitidos.`,
    };
  }

  // ✅ extrai weekday (0..6) + HH:mm na timezone
  const localParts = getLocalParts(dt, timeZone);
  const weekdayDb = localParts.weekdayDb; // 0..6 (compatível com schema.ts)
  const hhmm = localParts.hhmm;
  const minutesOfDay = localParts.minutesOfDay;

  // ✅ regra: grid do slot (ex.: 15min => minutos % 15 === 0)
  if (slot > 0 && minutesOfDay % slot !== 0) {
    return {
      ok: false,
      error: "not_on_grid",
      message: `Horário inválido (fora do intervalo de ${slot} minutos).`,
    };
  }

  // ✅ disponibilidade do profissional no dia (weekday do DB: 0..6)
  const schedules = await db
    .select({
      startTime: professionalSchedules.startTime,
      endTime: professionalSchedules.endTime,
      weekday: professionalSchedules.weekday,
    })
    .from(professionalSchedules)
    .where(
      and(
        eq(professionalSchedules.professionalId, input.professionalId),
        eq(professionalSchedules.weekday, weekdayDb),
      ),
    );

  if (!schedules.length) {
    return {
      ok: false,
      error: "no_schedule",
      message: "Profissional não tem disponibilidade neste dia.",
    };
  }

  let allowed = false;
  for (const sch of schedules) {
    // start inclusive, end exclusive
    if (hhmm >= sch.startTime && hhmm < sch.endTime) {
      allowed = true;
      break;
    }
  }

  if (!allowed) {
    return {
      ok: false,
      error: "out_of_range",
      message: "Horário fora do período de atendimento do profissional.",
    };
  }

  // ✅ conflito: só considera status ATIVO (ignora cancelled/no_show/etc)
  // e no reschedule ignora o próprio appointmentId
  const whereBase = [
    eq(appointments.professionalId, input.professionalId),
    eq(appointments.scheduledTime, dt),
    inArray(appointments.status, ACTIVE_STATUSES as unknown as string[]),
  ];

  if (input.appointmentIdToIgnore) {
    whereBase.push(ne(appointments.id, input.appointmentIdToIgnore));
  }

  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(...whereBase))
    .limit(1);

  if (existing.length && !allowOverbooking) {
    return {
      ok: false,
      error: "slot_taken",
      message: "Horário já reservado.",
    };
  }

  return { ok: true };
}

/* ===========================
   Helpers (timezone-safe)
=========================== */

function getLocalParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const hour = Number(get("hour") ?? "0");
  const minute = Number(get("minute") ?? "0");
  const weekdayShort = (get("weekday") ?? "").toLowerCase(); // sun, mon...
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));

  // ✅ compatível com professional_schedules.weekday (0..6)
  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const weekdayDb = weekdayShortToDb(weekdayShort);

  const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0",
  )}`;
  const minutesOfDay = hour * 60 + minute;

  return { year, month, day, hhmm, weekdayDb, minutesOfDay };
}

function getLocalYmd(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
  };
}

function daysBetweenYmd(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
) {
  const aUtc = Date.UTC(a.y, a.m - 1, a.d);
  const bUtc = Date.UTC(b.y, b.m - 1, b.d);
  return Math.floor((bUtc - aUtc) / 86_400_000);
}

function weekdayShortToDb(w: string): number {
  // en-US short: sun, mon, tue, wed, thu, fri, sat
  // DB: 0=Sun .. 6=Sat (compatível com schema.ts)
  switch (w) {
    case "sun":
      return 0;
    case "mon":
      return 1;
    case "tue":
      return 2;
    case "wed":
      return 3;
    case "thu":
      return 4;
    case "fri":
      return 5;
    case "sat":
      return 6;
    default:
      return 0;
  }
}
