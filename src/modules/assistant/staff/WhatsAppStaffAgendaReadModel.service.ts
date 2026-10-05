import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { DEFAULT_TIMEZONE, addDaysIso, formatPtBr, todayDateIso, zonedDateTimeToUtcISOString } from "@/lib/time";
import { parseSpokenDate } from "@/modules/assistant/whatsapp-core/interpreter/interpretMessage";
import {
  bookingItemAllocations,
  bookingItems,
  bookings,
  clients,
  professionals,
  schedulingConfig,
  services,
} from "@/drizzle/schema";
import type { StaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";
import type { StaffAgendaDay, StaffAgendaPeriod, StaffAgendaQuery } from "./WhatsAppStaffAgendaQuery";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const;
const MAX_RESULTS = 20;

export type StaffAgendaAppointment = {
  bookingId: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  clientName: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  status: string;
};

type StaffAgendaRow = Omit<StaffAgendaAppointment, "startTime" | "endTime" | "timeLabel"> & {
  startTime: Date | string;
  endTime: Date | string;
};

export type StaffAgendaReadModel = {
  kind: StaffAgendaQuery["kind"];
  period: StaffAgendaPeriod | null;
  day?: StaffAgendaDay | null;
  dateIso?: string | null;
  endDateIso?: string | null;
  targetProfessionalName?: string | null;
  timeZone: string;
  range: { start: string; end: string };
  appointments: StaffAgendaAppointment[];
  totalCount?: number;
};

export type StaffAgendaReadDependencies = {
  loadTimeZone(companyId: string): Promise<string | null>;
  loadAppointments(input: {
    companyId: string;
    professionalId: string | null;
    start: Date;
    end: Date;
    limit: number;
  }): Promise<StaffAgendaRow[]>;
  loadAppointmentCount(input: {
    companyId: string;
    professionalId: string | null;
    start: Date;
    end: Date;
  }): Promise<number>;
};

function getPeriodTimes(period: StaffAgendaPeriod) {
  switch (period) {
    case "morning": return { start: "00:00", end: "12:00" };
    case "afternoon": return { start: "12:00", end: "18:00" };
    case "evening": return { start: "18:00", end: "23:59" };
    default: return { start: "00:00", end: "23:59" };
  }
}

const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function monthStart(dateIso: string, offset = 0) {
  const [year, month] = dateIso.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + offset, 1));
  return value.toISOString().slice(0, 10);
}

function namedMonthStart(text: string, todayIso: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const monthIndex = MONTHS.findIndex((month) => new RegExp("\\b" + month + "\\b").test(normalized));
  if (monthIndex < 0) return null;
  const [currentYear, currentMonth] = todayIso.split("-").map(Number);
  const year = monthIndex + 1 < currentMonth ? currentYear + 1 : currentYear;
  return year + "-" + String(monthIndex + 1).padStart(2, "0") + "-01";
}

function weekMonday(dateIso: string) {
  const weekday = new Date(dateIso + "T00:00:00.000Z").getUTCDay();
  return addDaysIso(dateIso, -(weekday === 0 ? 6 : weekday - 1));
}

function makeDayRange(dateIso: string, period: StaffAgendaPeriod, timeZone: string) {
  const times = getPeriodTimes(period);
  const endDateIso = times.end === "23:59" ? addDaysIso(dateIso, 1) : dateIso;
  const endTime = times.end === "23:59" ? "00:00" : times.end;
  return {
    start: new Date(zonedDateTimeToUtcISOString(dateIso, times.start, timeZone)),
    end: new Date(zonedDateTimeToUtcISOString(endDateIso, endTime, timeZone)),
  };
}

function makeRanges(query: StaffAgendaQuery, timeZone: string, now: Date) {
  if (query.kind === "next_appointment") {
    const range = { start: now, end: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) };
    return { ranges: [range], period: null, day: null, dateIso: null, endDateIso: null };
  }
  const todayIso = todayDateIso(timeZone, now);
  const day: StaffAgendaDay = query.day === "specific" || query.day === "tomorrow" || query.day === "this_week" || query.day === "next_week" || query.day === "this_month" || query.day === "next_month" || query.day === "specific_month" ? query.day : "today";
  if (day === "this_month" || day === "next_month" || day === "specific_month") {
    const firstDate = day === "specific_month"
      ? namedMonthStart(query.dateText ?? "", todayIso)
      : monthStart(todayIso, day === "next_month" ? 1 : 0);
    if (!firstDate) throw new Error("invalid_staff_agenda_month");
    const nextMonthDate = monthStart(firstDate, 1);
    const endDateIso = addDaysIso(nextMonthDate, -1);
    if (query.period === "full_day") {
      return {
        ranges: [{
          start: new Date(zonedDateTimeToUtcISOString(firstDate, "00:00", timeZone)),
          end: new Date(zonedDateTimeToUtcISOString(nextMonthDate, "00:00", timeZone)),
        }],
        period: query.period,
        day,
        dateIso: firstDate,
        endDateIso,
      };
    }
    const dates: string[] = [];
    for (let dateIso = firstDate; dateIso < nextMonthDate; dateIso = addDaysIso(dateIso, 1)) dates.push(dateIso);
    return { ranges: dates.map((dateIso) => makeDayRange(dateIso, query.period, timeZone)), period: query.period, day, dateIso: firstDate, endDateIso };
  }
  if (day === "this_week" || day === "next_week") {
    const monday = addDaysIso(weekMonday(todayIso), day === "next_week" ? 7 : 0);
    const dates = Array.from({ length: 7 }, (_, index) => addDaysIso(monday, index));
    return {
      ranges: dates.map((dateIso) => makeDayRange(dateIso, query.period, timeZone)),
      period: query.period,
      day,
      dateIso: monday,
      endDateIso: addDaysIso(monday, 6),
    };
  }
  const dateIso = day === "specific"
    ? parseSpokenDate(query.dateText ?? "", now, timeZone)
    : day === "tomorrow" ? addDaysIso(todayIso, 1) : todayIso;
  if (!dateIso) throw new Error("invalid_staff_agenda_date");
  return { ranges: [makeDayRange(dateIso, query.period, timeZone)], period: query.period, day, dateIso, endDateIso: dateIso };
}

export async function readWhatsAppStaffAgenda(
  input: { identity: StaffAgendaIdentity; query: StaffAgendaQuery; now?: Date; targetProfessionalId?: string; targetProfessionalName?: string },
  dependencies: StaffAgendaReadDependencies = databaseDependencies,
): Promise<StaffAgendaReadModel> {
  const timeZone = (await dependencies.loadTimeZone(input.identity.companyId)) || DEFAULT_TIMEZONE;
  const resolved = makeRanges(input.query, timeZone, input.now ?? new Date());
  const professionalId = input.targetProfessionalId ?? (input.identity.role === "professional" ? input.identity.professionalId : null);
  const scopes = resolved.ranges.map((range) => ({ companyId: input.identity.companyId, professionalId, start: range.start, end: range.end }));
  let totalCount: number | undefined;
  let rows: StaffAgendaRow[];
  if (input.query.kind === "day_summary") {
    const counts = await Promise.all(scopes.map((scope) => dependencies.loadAppointmentCount(scope)));
    totalCount = counts.reduce((sum, count) => sum + count, 0);
    rows = [];
  } else if (input.query.kind === "day_agenda") {
    const [counts, rowGroups] = await Promise.all([
      Promise.all(scopes.map((scope) => dependencies.loadAppointmentCount(scope))),
      Promise.all(scopes.map((scope) => dependencies.loadAppointments({ ...scope, limit: MAX_RESULTS }))),
    ]);
    totalCount = counts.reduce((sum, count) => sum + count, 0);
    rows = rowGroups.flat().sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()).slice(0, MAX_RESULTS);
  } else {
    rows = await dependencies.loadAppointments({ ...scopes[0], limit: 1 });
  }

  const firstRange = resolved.ranges[0];
  const lastRange = resolved.ranges[resolved.ranges.length - 1];
  return {
    kind: input.query.kind,
    period: resolved.period,
    day: resolved.day,
    dateIso: resolved.dateIso ?? null,
    endDateIso: resolved.endDateIso ?? null,
    targetProfessionalName: input.targetProfessionalName ?? null,
    timeZone,
    range: { start: firstRange.start.toISOString(), end: lastRange.end.toISOString() },
    appointments: rows.map((row) => ({
      ...row,
      startTime: new Date(row.startTime).toISOString(),
      endTime: new Date(row.endTime).toISOString(),
      timeLabel: formatPtBr(new Date(row.startTime).toISOString(), timeZone),
    })),
    totalCount,
  };
}

const databaseDependencies: StaffAgendaReadDependencies = {
  async loadTimeZone(companyId) {
    const db = getDb();
    const [row] = await db
      .select({ timeZone: schedulingConfig.timezone })
      .from(schedulingConfig)
      .where(eq(schedulingConfig.companyId, companyId))
      .limit(1);
    return row?.timeZone ?? null;
  },

  async loadAppointmentCount(input) {
    const db = getDb();
    const conditions = [
      eq(bookings.companyId, input.companyId),
      gte(bookings.startTime, input.start),
      lt(bookings.startTime, input.end),
      inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
    ];
    if (input.professionalId) conditions.push(eq(professionals.id, input.professionalId));

    const [row] = await db
      .select({ total: sql<number>`count(distinct ${bookingItems.id})::int` })
      .from(bookings)
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .innerJoin(bookingItemAllocations, eq(bookingItemAllocations.bookingItemId, bookingItems.id))
      .innerJoin(professionals, and(eq(professionals.resourceId, bookingItemAllocations.resourceId), eq(professionals.companyId, input.companyId)))
      .where(and(...conditions));
    return Number(row?.total ?? 0);
  },

  async loadAppointments(input) {
    const db = getDb();
    const conditions = [
      eq(bookings.companyId, input.companyId),
      gte(bookings.startTime, input.start),
      lt(bookings.startTime, input.end),
      inArray(bookings.status, [...ACTIVE_BOOKING_STATUSES]),
    ];
    if (input.professionalId) conditions.push(eq(professionals.id, input.professionalId));

    return db
      .select({
        bookingId: bookings.id,
        startTime: bookingItems.startTime,
        endTime: bookingItems.endTime,
        clientName: clients.name,
        serviceName: services.name,
        professionalId: professionals.id,
        professionalName: professionals.name,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(clients, and(eq(clients.id, bookings.clientId), eq(clients.companyId, input.companyId)))
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .innerJoin(services, and(eq(services.id, bookingItems.serviceId), eq(services.companyId, input.companyId)))
      .innerJoin(bookingItemAllocations, eq(bookingItemAllocations.bookingItemId, bookingItems.id))
      .innerJoin(professionals, and(eq(professionals.resourceId, bookingItemAllocations.resourceId), eq(professionals.companyId, input.companyId)))
      .where(and(...conditions))
      .orderBy(asc(bookings.startTime), asc(bookings.id))
      .limit(input.limit);
  },
};
