/* src/modules/professionals/Professional.repository.ts */

import { db } from "@/lib/db";
import { professionals } from "@/drizzle/schema";
import { eq, ilike, and } from "drizzle-orm";

export class ProfessionalRepository {
  // -------------------------------------------------------
  // LIST
  // -------------------------------------------------------
  static async list(params?: { page?: number; search?: string }) {
    const conditions = [];

    if (params?.search) {
      conditions.push(ilike(professionals.name, `%${params.search}%`));
    }

    // Se não há condições, retorna tudo
    if (conditions.length === 0) {
      return db.select().from(professionals);
    }

    // Se há condições, aplica o AND
    return db
      .select()
      .from(professionals)
      .where(and(...conditions));
  }

  // -------------------------------------------------------
  // GET BY ID (legacy)
  // -------------------------------------------------------
  static async getById(id: string) {
    const result = await db
      .select()
      .from(professionals)
      .where(eq(professionals.id, id));

    return result[0] ?? null;
  }

  // -------------------------------------------------------
  // FIND BY ID (contrato oficial)
  // -------------------------------------------------------
  static async findById(id: string) {
    return this.getById(id);
  }

  // -------------------------------------------------------
  // CREATE
  // -------------------------------------------------------
  static async create(data: any) {
    const result = await db.insert(professionals).values(data).returning();
    return result[0];
  }

  // -------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------
  static async update(id: string, data: any) {
    const result = await db
      .update(professionals)
      .set(data)
      .where(eq(professionals.id, id))
      .returning();

    return result[0];
  }

  // -------------------------------------------------------
  // DELETE
  // -------------------------------------------------------
  static async delete(id: string) {
    await db.delete(professionals).where(eq(professionals.id, id));
    return true;
  }

  // alias de compatibilidade
  static async remove(id: string) {
    return this.delete(id);
  }
}
