// src/lib/db.ts
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

  // ✅ IMPORTANTE: não estoura aqui no import do arquivo, só quando alguém pedir conexão
  if (!host || !db || !user || !pass) {
    return null;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    pass
  )}@${host}:${port}/${db}`;
}

// ---------------------------------------
// LAZY INIT (não roda nada no import)
// ---------------------------------------
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getPool() {
  if (_pool) return _pool;

  const connectionString = buildDatabaseUrl();

  // ✅ Agora sim: se alguém tentou usar DB em runtime sem config, explode com msg clara
  if (!connectionString) {
    throw new Error(
      "DB config missing. Provide DATABASE_URL or DB_HOST/DB_NAME/DB_USER + DB_PASSWORD(_FILE)."
    );
  }

  _pool = new Pool({
    connectionString,
    ssl:
      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  return _pool;
}

export function getDb() {
  if (_db) return _db;
  _db = drizzle(getPool());
  return _db;
}

// ---------------------------------------
// Compat: mantém export db/pool,
// mas agora só cria quando acessar.
// ---------------------------------------
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
}) as ReturnType<typeof drizzle>;

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
}) as Pool;
