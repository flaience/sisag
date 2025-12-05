import { db } from "@/lib/db";
import { companies } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export class CompanyRepository {
  static async findAll() {
    return db.select().from(companies);
  }

  static async findById(id: string) {
    const rows = await db.select().from(companies).where(eq(companies.id, id));

    return rows[0] ?? null;
  }

  static async create(data: any) {
    const [row] = await db.insert(companies).values(data).returning();
    return row;
  }

  static async update(id: string, data: any) {
    const [row] = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();

    return row;
  }

  static async delete(id: string) {
    const [row] = await db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning();

    return row;
  }
}
