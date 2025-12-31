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
      "DB config missing. Provide DATABASE_URL_FILE, DATABASE_URL, or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE)."
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    pass
  )}@${host}:${port}/${dbName}`;
}

function ensurePool() {
  if (pool) return pool;

  const url = buildDatabaseUrl();

  // ✅ LOG TEMPORÁRIO (NÃO vaza senha)
  try {
    const u = new URL(url);
    console.log("[DB]", {
      host: u.hostname,
      port: u.port || "(default)",
      db: u.pathname,
    });
  } catch {
    console.log("[DB] using database url");
  }

  pool = new Pool({
    connectionString: url,

    // ✅ Supabase / Pooler exige SSL
    // sslmode=no-verify já está na URL, então não forçamos aqui
    ssl: url.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
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
