// src/lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "fs";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function buildDatabaseUrl() {
  // ✅ 1) Swarm secret (DATABASE_URL_FILE)
  const fromFile = readSecret(process.env.DATABASE_URL_FILE);
  if (fromFile) return fromFile;

  // ✅ 2) Env direta
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // ❌ 3) Fallback legacy (idealmente remover do stack)
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "5432";
  const dbName = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const pass =
    readSecret(process.env.DB_PASSWORD_FILE) ?? process.env.DB_PASSWORD;

  if (!host || !dbName || !user || !pass) {
    throw new Error(
      "DB config missing. Provide DATABASE_URL_FILE, DATABASE_URL, or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE).",
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    pass,
  )}@${host}:${port}/${dbName}`;
}

function ensurePool() {
  if (pool) return pool;

  const url = buildDatabaseUrl();

  try {
    const u = new URL(url);
    console.log("[DB] connected", {
      host: u.hostname,
      port: u.port,
      db: u.pathname,
    });
  } catch {
    console.log("[DB] connected");
  }

  // ✅ Ajustes via env (seguro e previsível)
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

    // Se o URL já tiver sslmode=..., respeite; senão, aplica TLS "compatível"
    ssl: url.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
  });

  // ✅ CRÍTICO: evita crash "Unhandled 'error' event"
  pool.on("error", (err: any) => {
    console.error("[PG_POOL_ERROR]", {
      code: err?.code,
      message: err?.message,
    });
    // NÃO derruba o processo — o pool se recupera em conexões novas
  });

  return pool;
}

export function getDb() {
  if (db) return db;
  db = drizzle(ensurePool());
  return db;
}

// ✅ Para workers / scripts
export function getPool() {
  return ensurePool();
}

// ✅ Compatibilidade antiga
export { pool };
