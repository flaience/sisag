// src/lib/db-errors.ts
export function isPgUniqueViolation(err: unknown): boolean {
  const e = err as any;
  // Postgres unique_violation
  if (e?.code === "23505") return true;
  const msg = String(e?.message ?? "");
  return msg.includes("duplicate key value violates unique constraint");
}

export function isConstraint(err: unknown, constraintName: string): boolean {
  const e = err as any;
  if (e?.constraint === constraintName) return true;
  const msg = String(e?.message ?? "");
  return msg.includes(constraintName);
}
