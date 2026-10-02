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

function makeRange(query: StaffAgendaQuery, timeZone: string, now: Date) {
  if (query.kind === "next_appointment") {
    return { start: now, end: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), period: null, day: null, dateIso: null };
  }
  const todayIso = todayDateIso(timeZone, now);
  const day: StaffAgendaDay = query.day === "specific" ? "specific" : query.day === "tomorrow" ? "tomorrow" : "today";
  const dateIso = day === "specific"
    ? parseSpokenDate(query.dateText ?? "", now, timeZone)
    : day === "tomorrow" ? addDaysIso(todayIso, 1) : todayIso;
  if (!dateIso) throw new Error("invalid_staff_agenda_date");
  const times = getPeriodTimes(query.period);
  const endDateIso = times.end === "23:59" ? addDaysIso(dateIso, 1) : dateIso;
  const endTime = times.end === "23:59" ? "00:00" : times.end;
  return {
    start: new Date(zonedDateTimeToUtcISOString(dateIso, times.start, timeZone)),
    end: new Date(zonedDateTimeToUtcISOString(endDateIso, endTime, timeZone)),
    period: query.period,
    day,
    dateIso,
  };
}

export async function readWhatsAppStaffAgenda(
  input: { identity: StaffAgendaIdentity; query: StaffAgendaQuery; now?: Date },
  dependencies: StaffAgendaReadDependencies = databaseDependencies,
): Promise<StaffAgendaReadModel> {
  const timeZone = (await dependencies.loadTimeZone(input.identity.companyId)) || DEFAULT_TIMEZONE;
  const range = makeRange(input.query, timeZone, input.now ?? new Date());
  const professionalId = input.identity.role === "professional" ? input.identity.professionalId : null;
  const scope = { companyId: input.identity.companyId, professionalId, start: range.start, end: range.end };
  let totalCount: number | undefined;
  let rows: StaffAgendaRow[];
  if (input.query.kind === "day_summary") {
    totalCount = await dependencies.loadAppointmentCount(scope);
    rows = [];
  } else if (input.query.kind === "day_agenda") {
    [totalCount, rows] = await Promise.all([
      dependencies.loadAppointmentCount(scope),
      dependencies.loadAppointments({ ...scope, limit: MAX_RESULTS }),
    ]);
  } else {
    rows = await dependencies.loadAppointments({ ...scope, limit: 1 });
  }

  return {
    kind: input.query.kind,
    period: range.period,
    day: range.day,
    dateIso: range.dateIso ?? null,
    timeZone,
    range: { start: range.start.toISOString(), end: range.end.toISOString() },
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
