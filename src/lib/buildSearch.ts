import { ilike, or, SQL } from "drizzle-orm";

export function buildSearch(search: string, fields: any[]): SQL | null {
  if (!search || fields.length === 0) return null;

  const pattern = `%${search}%`;

  // mapeia todos os campos → SQL
  const conditions: SQL[] = fields.map((field) => ilike(field, pattern));

  // nunca retorna undefined — se tiver ao menos 1 campo, retorna SQL
  if (conditions.length === 1) {
    return conditions[0]!;
  }

  // retorna OR de todos — SEM undefined
  return or(...conditions) as SQL;
}
