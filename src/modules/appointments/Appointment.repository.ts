// src/modules/appointments/Appointment.repository.ts
import { db } from "@/lib/db";
import { appointments, clients, professionals } from "@/drizzle/schema";
import { eq, and, ilike } from "drizzle-orm";

export class AppointmentRepository {
  static list(filters: {
    date?: string;
    search?: string;
    professionalId?: string;
  }) {
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
        eq(professionals.id, appointments.professionalId)
      );

    const conditions = [];

    // filtro por data (YYYY-MM-DD)
    if (filters.date) {
      conditions.push(ilike(appointments.scheduledTime, `${filters.date}%`));
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
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));

    return rows[0] ?? null;
  }

  static async create(data: any) {
    const [row] = await db.insert(appointments).values(data).returning();
    return row;
  }

  static async update(id: string, data: any) {
    const [row] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning();
    return row;
  }

  static async delete(id: string) {
    await db.delete(appointments).where(eq(appointments.id, id));
  }
}
