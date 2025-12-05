//src/modules/people/People.repository.ts

import { db } from "@/lib/db";
import { clients as people } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export class PeopleRepository {
  static list() {
    return db.select().from(people);
  }

  static async findById(id: string) {
    const rows = await db.select().from(people).where(eq(people.id, id));
    return rows[0] ?? null;
  }

  static async create(data: any) {
    const [row] = await db.insert(people).values(data).returning();
    return row;
  }

  static async update(id: string, data: any) {
    const [row] = await db
      .update(people)
      .set(data)
      .where(eq(people.id, id))
      .returning();

    return row;
  }

  static async delete(id: string) {
    const [row] = await db.delete(people).where(eq(people.id, id)).returning();

    return row;
  }
}
