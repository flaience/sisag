// src/modules/appointments/Appointment.repository.ts
import { getDb } from "@/lib/db";
import { appointments, clients, professionals } from "@/drizzle/schema";
import { eq, and, ilike, asc, gte, inArray } from "drizzle-orm";

export class AppointmentRepository {
  static list(filters: {
    date?: string;
    search?: string;
    professionalId?: string;
  }) {
    const db = getDb();
    let query = db
      .select({
        id: appointments.id,
        scheduledTime: appointments.scheduledTime,
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

    const conditions: any[] = [];

    // filtro por data (YYYY-MM-DD)
    // ⚠️ Nota: scheduledTime é timestamp; manter como está por compat (depois ajustamos para range)
    if (filters.date) {
      conditions.push(
        ilike(appointments.scheduledTime as any, `${filters.date}%`),
      );
    }

    // filtro por nome do cliente
    if (filters.search) {
      conditions.push(ilike(clients.name, `%${filters.search}%`));
    }

    // filtro por profissional
    if (filters.professionalId) {
      conditions.push(eq(appointments.professionalId, filters.professionalId));
    }

    if (conditions.length > 0) {
      // drizzle não aceita array diretamente no where
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    return query;
  }

  static async findById(id: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
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

  /* =========================================================
     ✅ NOVOS MÉTODOS: Cancelamento via WhatsApp
     - multi-tenant seguro (companyId obrigatório)
  ========================================================= */

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

          // ✅ status uppercase (compatível com seu service)
          inArray(appointments.status, ["PENDING", "CONFIRMED"]),

          // ✅ só futuro
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
        status: "cancelled",
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
