import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "fs";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "5432";
  const db = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass =
    readSecret(process.env.DB_PASSWORD_FILE) ?? process.env.DB_PASSWORD;

  if (!host || !db || !user || !pass) {
    throw new Error(
      "DB config missing. Provide DATABASE_URL or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE)."
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    pass
  )}@${host}:${port}/${db}`;
}

const connectionString = buildDatabaseUrl();

const pool = new Pool({
  connectionString,
  ssl:
    process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);
export { pool };
