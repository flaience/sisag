import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function acquireLock(key: bigint | string) {
  await db.execute(sql`SELECT pg_advisory_lock(${key}::bigint)`);
}

export async function releaseLock(key: bigint | string) {
  await db.execute(sql`SELECT pg_advisory_unlock(${key}::bigint)`);
}
