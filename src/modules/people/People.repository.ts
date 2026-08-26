//src/modules/people/People.repository.ts

import { getDb } from "@/lib/db";
import { clients as people } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export class PeopleRepository {
  static list() {
    const db = getDb();
    return db.select().from(people);
  }

  static async findById(id: string) {
    const db = getDb();
    const rows = await db.select().from(people).where(eq(people.id, id));
    return rows[0] ?? null;
  }

  static async findByIdScoped(params: { companyId: string; personId: string }) {
    const db = getDb();
    const rows = await db.select().from(people).where(and(
      eq(people.companyId, params.companyId),
      eq(people.id, params.personId),
    ));
    return rows[0] ?? null;
  }

  static async create(data: any) {
    const db = getDb();
    const [row] = await db.insert(people).values(data).returning();
    return row;
  }

  static async update(id: string, data: any) {
    const db = getDb();
    const [row] = await db
      .update(people)
      .set(data)
      .where(eq(people.id, id))
      .returning();

    return row;
  }

  static async delete(id: string) {
    const db = getDb();
    const [row] = await db.delete(people).where(eq(people.id, id)).returning();

    return row;
  }
}
