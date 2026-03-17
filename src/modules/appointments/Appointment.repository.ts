import { getDb } from "@/lib/db";
import { appointments, clients, professionals } from "@/drizzle/schema";
import { eq, and, ilike, asc, gte, lte, inArray, type SQL } from "drizzle-orm";

type AppointmentListFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  professionalId?: string;
  status?: string;
  companyId?: string;
};

function startOfDay(date: string) {
  return new Date(`${date}T00:00:00`);
}

function endOfDay(date: string) {
  return new Date(`${date}T23:59:59.999`);
}

export class AppointmentRepository {
  static async createTx(tx: any, data: any) {
    const db = tx ?? getDb();
    const [row] = await db.insert(appointments).values(data).returning();
    return row;
  }

  static async updateTx(tx: any, id: string, data: any) {
    const db = tx ?? getDb();
    const [row] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning();
    return row;
  }

  static list(filters: AppointmentListFilters = {}) {
    const db = getDb();

    let query = db
      .select({
        id: appointments.id,
        companyId: appointments.companyId,
        scheduledTime: appointments.scheduledTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        serviceNameSnapshot: appointments.serviceNameSnapshot,
        status: appointments.status,
        professionalId: professionals.id,
        professionalName: professionals.name,
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(
        professionals,
        eq(professionals.id, appointments.professionalId),
      );

    const conditions: SQL[] = [];

    if (filters.date) {
      conditions.push(
        gte(appointments.scheduledTime, startOfDay(filters.date)),
      );
      conditions.push(lte(appointments.scheduledTime, endOfDay(filters.date)));
    }

    if (filters.dateFrom) {
      conditions.push(
        gte(appointments.scheduledTime, startOfDay(filters.dateFrom)),
      );
    }

    if (filters.dateTo) {
      conditions.push(
        lte(appointments.scheduledTime, endOfDay(filters.dateTo)),
      );
    }

    if (filters.search) {
      conditions.push(ilike(clients.name, `%${filters.search}%`));
    }

    if (filters.professionalId) {
      conditions.push(eq(appointments.professionalId, filters.professionalId));
    }

    if (filters.status) {
      conditions.push(eq(appointments.status, filters.status));
    }

    if (filters.companyId) {
      conditions.push(eq(appointments.companyId, filters.companyId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(asc(appointments.scheduledTime));
  }

  static async findById(id: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));

    return rows[0] ?? null;
  }

  static async findDetailedById(id: string) {
    const db = getDb();

    const rows = await db
      .select({
        id: appointments.id,
        companyId: appointments.companyId,
        professionalId: appointments.professionalId,
        clientId: appointments.clientId,

        scheduledTime: appointments.scheduledTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        serviceNameSnapshot: appointments.serviceNameSnapshot,

        status: appointments.status,
        confirmedAt: appointments.confirmedAt,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,

        professionalName: professionals.name,

        clientName: clients.name,
        clientEmail: clients.email,
        clientPhone: clients.phoneE164,
      })
      .from(appointments)
      .leftJoin(clients, eq(clients.id, appointments.clientId))
      .leftJoin(
        professionals,
        eq(professionals.id, appointments.professionalId),
      )
      .where(eq(appointments.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  static async create(data: any) {
    const db = getDb();
    const [row] = await db.insert(appointments).values(data).returning();
    return row;
  }

  static async update(id: string, data: any) {
    const db = getDb();
    const [row] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning();
    return row;
  }

  static async delete(id: string) {
    const db = getDb();
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  static async findNextActiveByClient(params: {
    companyId: string;
    clientId: string;
    now?: Date;
  }) {
    const db = getDb();
    const now = params.now ?? new Date();

    const rows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, params.companyId),
          eq(appointments.clientId, params.clientId),
          inArray(appointments.status, ["PENDING", "CONFIRMED"]),
          gte(appointments.scheduledTime, now),
        ),
      )
      .orderBy(asc(appointments.scheduledTime))
      .limit(1);

    return rows[0] ?? null;
  }

  static async cancelById(params: {
    companyId: string;
    appointmentId: string;
  }) {
    const db = getDb();

    const rows = await db
      .update(appointments)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.id, params.appointmentId),
          eq(appointments.companyId, params.companyId),
        ),
      )
      .returning();

    return rows[0] ?? null;
  }

  static async listNextActiveByClient(params: {
    companyId: string;
    clientId: string;
    now?: Date;
    limit?: number;
  }) {
    const db = getDb();
    const now = params.now ?? new Date();
    const limit = params.limit ?? 3;

    const rows = await db
      .select({
        id: appointments.id,
        companyId: appointments.companyId,
        clientId: appointments.clientId,
        professionalId: appointments.professionalId,
        scheduledTime: appointments.scheduledTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        serviceNameSnapshot: appointments.serviceNameSnapshot,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, params.companyId),
          eq(appointments.clientId, params.clientId),
          inArray(appointments.status, ["PENDING", "CONFIRMED"]),
          gte(appointments.scheduledTime, now),
        ),
      )
      .orderBy(asc(appointments.scheduledTime))
      .limit(limit);

    return rows;
  }

  static async findByIdScoped(params: {
    companyId: string;
    appointmentId: string;
  }) {
    const db = getDb();

    const rows = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.companyId, params.companyId),
          eq(appointments.id, params.appointmentId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }
}
