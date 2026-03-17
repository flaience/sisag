import { and, asc, eq, gte, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { formatTime } from "@/lib/time";
import { appointments, clients, professionals } from "@/drizzle/schema";
import type {
  AgendaAppointmentItem,
  AgendaDayData,
  AgendaFilterOptions,
  AgendaProfessionalColumn,
  AgendaProfessionalSummary,
  AgendaStatusFilter,
} from "./Agenda.types";

function getDayRange(dateIso: string) {
  const start = new Date(`${dateIso}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
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

export class AgendaService {
  static async getDayAgenda(
    companyId: string,
    options: AgendaFilterOptions,
  ): Promise<AgendaDayData> {
    const db = getDb();
    const { start, end } = getDayRange(options.dateIso);

    const statusFilter = normalizeStatusFilter(options.status);
    const professionalIdFilter = options.professionalId || null;

    const whereConditions = [
      eq(appointments.companyId, companyId),
      gte(appointments.scheduledTime, start),
      lt(appointments.scheduledTime, end),
    ];

    if (professionalIdFilter) {
      whereConditions.push(
        eq(appointments.professionalId, professionalIdFilter),
      );
    }

    if (statusFilter !== "ALL") {
      whereConditions.push(eq(appointments.status, statusFilter));
    }

    const [appointmentRows, professionalRows] = await Promise.all([
      db
        .select({
          id: appointments.id,
          scheduledTime: appointments.scheduledTime,
          endTime: appointments.endTime,
          durationMinutes: appointments.durationMinutes,
          serviceNameSnapshot: appointments.serviceNameSnapshot,
          status: appointments.status,
          clientName: clients.name,
          professionalId: professionals.id,
          professionalName: professionals.name,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .leftJoin(
          professionals,
          eq(appointments.professionalId, professionals.id),
        )
        .where(and(...whereConditions))
        .orderBy(asc(appointments.scheduledTime)),

      db
        .select({
          id: professionals.id,
          name: professionals.name,
        })
        .from(professionals)
        .where(eq(professionals.companyId, companyId))
        .orderBy(asc(professionals.name)),
    ]);

    const appointmentsList: AgendaAppointmentItem[] = appointmentRows.map(
      (row) => ({
        id: String(row.id),
        scheduledTime: new Date(row.scheduledTime).toISOString(),
        endTime: new Date(row.endTime).toISOString(),
        timeLabel: formatTime(new Date(row.scheduledTime).toISOString()),
        status: row.status ?? "PENDING",
        clientName: row.clientName ?? "Cliente não identificado",
        professionalId: row.professionalId ? String(row.professionalId) : null,
        professionalName: row.professionalName ?? null,
        durationMinutes: Number(row.durationMinutes ?? 30),
        serviceNameSnapshot: row.serviceNameSnapshot ?? null,
        hasConflict: false,
      }),
    );

    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    let completed = 0;

    const professionalMap = new Map<string, AgendaProfessionalSummary>();
    const boardMap = new Map<string, AgendaProfessionalColumn>();

    for (const professional of professionalRows) {
      const professionalId = String(professional.id);

      professionalMap.set(professionalId, {
        professionalId,
        professionalName: professional.name,
        totalAppointments: 0,
        confirmed: 0,
        pending: 0,
      });

      boardMap.set(professionalId, {
        professionalId,
        professionalName: professional.name,
        appointments: [],
        totalAppointments: 0,
        confirmed: 0,
        pending: 0,
      });
    }

    for (const item of appointmentsList) {
      total += 1;

      switch (item.status) {
        case "CONFIRMED":
          confirmed += 1;
          break;
        case "PENDING":
          pending += 1;
          break;
        case "CANCELLED":
          cancelled += 1;
          break;
        case "COMPLETED":
          completed += 1;
          break;
      }

      if (!item.professionalId) continue;

      const summary = professionalMap.get(item.professionalId);
      if (summary) {
        summary.totalAppointments += 1;
        if (item.status === "CONFIRMED") summary.confirmed += 1;
        if (item.status === "PENDING") summary.pending += 1;
      }

      const boardColumn = boardMap.get(item.professionalId);
      if (boardColumn) {
        boardColumn.appointments.push(item);
        boardColumn.totalAppointments += 1;
        if (item.status === "CONFIRMED") boardColumn.confirmed += 1;
        if (item.status === "PENDING") boardColumn.pending += 1;
      }
    }

    let board = Array.from(boardMap.values());

    if (professionalIdFilter) {
      board = board.filter(
        (item) => item.professionalId === professionalIdFilter,
      );
    }

    return {
      dateIso: options.dateIso,
      stats: {
        total,
        confirmed,
        pending,
        cancelled,
        completed,
        professionalsOnDay: board.filter((item) => item.totalAppointments > 0)
          .length,
      },
      appointments: appointmentsList,
      professionals: Array.from(professionalMap.values()),
      board,
      availableProfessionals: professionalRows.map((row) => ({
        id: String(row.id),
        name: row.name,
      })),
      appliedFilters: {
        professionalId: professionalIdFilter,
        status: statusFilter,
      },
    };
  }
}
