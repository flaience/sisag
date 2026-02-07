import { Pool } from "pg";
import * as fs from "node:fs";

let pool: Pool | null = null;

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function buildDatabaseUrl() {
  const fromFile = readSecret(process.env.DATABASE_URL_FILE);
  if (fromFile) return fromFile;

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  throw new Error(
    "DB config missing. Provide DATABASE_URL_FILE or DATABASE_URL.",
  );
}

export function getPool() {
  if (pool) return pool;

  const url = buildDatabaseUrl();

  const max = Number(process.env.PG_POOL_SIZE ?? "5");
  const idleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS ?? "30000");
  const connectionTimeoutMillis = Number(
    process.env.PG_CONN_TIMEOUT_MS ?? "10000",
  );

  pool = new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    ssl: url.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
  });

  pool.on("error", (err: any) => {
    console.error("[PG_POOL_ERROR]", {
      code: err?.code,
      message: err?.message,
    });
  });

  return pool;
}
