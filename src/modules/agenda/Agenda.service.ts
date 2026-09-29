import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { DEFAULT_TIMEZONE, formatTime, zonedDateTimeToUtcISOString } from "@/lib/time";
import {
  bookingItemAllocations,
  bookingItems,
  bookings,
  clients,
  professionals,
  services,
} from "@/drizzle/schema";
import type {
  AgendaAppointmentItem,
  AgendaDayData,
  AgendaFilterOptions,
  AgendaProfessionalColumn,
  AgendaProfessionalSummary,
  AgendaStatusFilter,
} from "./Agenda.types";

export function getAgendaDayRange(dateIso: string) {
  const start = new Date(zonedDateTimeToUtcISOString(dateIso, "00:00", DEFAULT_TIMEZONE));
  const nextDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end: nextDay };
}

function normalizeStatusFilter(status?: string): AgendaStatusFilter {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
    case "CANCELLED":
    case "COMPLETED":
    case "RESCHEDULED":
      return status;
    default:
      return "ALL";
  }
}

type AgendaBookingBaseRow = {
  id: string;
  startTime: Date | string;
  status: string;
  clientName: string | null;
};

type AgendaBookingDetailRow = {
  bookingId: string;
  endTime: Date | string | null;
  serviceName: string | null;
  professionalId: string | null;
  professionalName: string | null;
};

export function composeAgendaBookingItems(
  baseRows: AgendaBookingBaseRow[],
  detailRows: AgendaBookingDetailRow[],
): AgendaAppointmentItem[] {
  const details = new Map<string, AgendaBookingDetailRow>();
  for (const detail of detailRows) {
    const currentDetail = details.get(detail.bookingId);
    if (!currentDetail || (!currentDetail.professionalId && detail.professionalId)) {
      details.set(detail.bookingId, detail);
    }
  }

  return baseRows.map(row => {
    const detail = details.get(row.id);
    const start = new Date(row.startTime);
    const end = detail?.endTime ? new Date(detail.endTime) : new Date(start.getTime() + 30 * 60 * 1000);
    return {
      id: row.id,
      scheduledTime: start.toISOString(),
      endTime: end.toISOString(),
      timeLabel: formatTime(start.toISOString(), DEFAULT_TIMEZONE),
      status: row.status || "PENDING",
      clientName: row.clientName ?? "Cliente não identificado",
      professionalId: detail?.professionalId ?? null,
      professionalName: detail?.professionalName ?? null,
      durationMinutes: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      serviceNameSnapshot: detail?.serviceName ?? null,
      hasConflict: false,
    };
  });
}

export class AgendaService {
  static async getDayAgenda(
    companyId: string,
    options: AgendaFilterOptions,
  ): Promise<AgendaDayData> {
    const db = getDb();
    const { start, end } = getAgendaDayRange(options.dateIso);
    const statusFilter = normalizeStatusFilter(options.status);
    const professionalIdFilter = options.professionalId || null;

    const whereConditions = [
      eq(bookings.companyId, companyId),
      gte(bookings.startTime, start),
      lt(bookings.startTime, end),
    ];
    if (statusFilter !== "ALL") whereConditions.push(eq(bookings.status, statusFilter));

    const [bookingRows, professionalRows] = await Promise.all([
      db
        .select({
          id: bookings.id,
          startTime: bookings.startTime,
          status: bookings.status,
          clientName: clients.name,
        })
        .from(bookings)
        .leftJoin(clients, and(eq(bookings.clientId, clients.id), eq(clients.companyId, companyId)))
        .where(and(...whereConditions))
        .orderBy(asc(bookings.startTime), asc(bookings.id)),
      db
        .select({ id: professionals.id, name: professionals.name })
        .from(professionals)
        .where(eq(professionals.companyId, companyId))
        .orderBy(asc(professionals.name)),
    ]);

    const bookingIds = bookingRows.map(row => row.id);
    const detailRows = bookingIds.length
      ? await db
          .select({
            bookingId: bookingItems.bookingId,
            endTime: bookingItems.endTime,
            serviceName: services.name,
            professionalId: professionals.id,
            professionalName: professionals.name,
          })
          .from(bookingItems)
          .leftJoin(services, and(eq(bookingItems.serviceId, services.id), eq(services.companyId, companyId)))
          .leftJoin(bookingItemAllocations, eq(bookingItemAllocations.bookingItemId, bookingItems.id))
          .leftJoin(professionals, and(eq(professionals.resourceId, bookingItemAllocations.resourceId), eq(professionals.companyId, companyId)))
          .where(inArray(bookingItems.bookingId, bookingIds))
      : [];

    let appointmentsList = composeAgendaBookingItems(bookingRows, detailRows);
    if (professionalIdFilter) {
      appointmentsList = appointmentsList.filter(item => item.professionalId === professionalIdFilter);
    }

    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    let completed = 0;
    const professionalMap = new Map<string, AgendaProfessionalSummary>();
    const boardMap = new Map<string, AgendaProfessionalColumn>();

    for (const professional of professionalRows) {
      const professionalId = String(professional.id);
      professionalMap.set(professionalId, { professionalId, professionalName: professional.name, totalAppointments: 0, confirmed: 0, pending: 0 });
      boardMap.set(professionalId, { professionalId, professionalName: professional.name, appointments: [], totalAppointments: 0, confirmed: 0, pending: 0 });
    }

    for (const item of appointmentsList) {
      total += 1;
      if (item.status === "CONFIRMED") confirmed += 1;
      if (item.status === "PENDING") pending += 1;
      if (item.status === "CANCELLED") cancelled += 1;
      if (item.status === "COMPLETED") completed += 1;
      if (!item.professionalId) continue;

      const summary = professionalMap.get(item.professionalId);
      if (summary) {
        summary.totalAppointments += 1;
        if (item.status === "CONFIRMED") summary.confirmed += 1;
        if (item.status === "PENDING") summary.pending += 1;
      }
      const column = boardMap.get(item.professionalId);
      if (column) {
        column.appointments.push(item);
        column.totalAppointments += 1;
        if (item.status === "CONFIRMED") column.confirmed += 1;
        if (item.status === "PENDING") column.pending += 1;
      }
    }

    let board = Array.from(boardMap.values());
    if (professionalIdFilter) board = board.filter(item => item.professionalId === professionalIdFilter);

    return {
      dateIso: options.dateIso,
      stats: { total, confirmed, pending, cancelled, completed, professionalsOnDay: board.filter(item => item.totalAppointments > 0).length },
      appointments: appointmentsList,
      professionals: Array.from(professionalMap.values()),
      board,
      availableProfessionals: professionalRows.map(row => ({ id: String(row.id), name: row.name })),
      appliedFilters: { professionalId: professionalIdFilter, status: statusFilter },
    };
  }
}
