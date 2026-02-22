import * as fs from "node:fs";
import { Pool } from "pg";

function readSecret(path?: string) {
  if (!path) return undefined;
  try {
    return fs.readFileSync(path, "utf8").trim();
  } catch {
    return undefined;
  }
}

function getDatabaseUrl() {
  const fromFile =
    readSecret(process.env.DATABASE_URL_FILE) ??
    readSecret(process.env.SISAG_DATABASE_URL_FILE);
  if (fromFile) return fromFile;

  const fromEnv = process.env.DATABASE_URL ?? process.env.SISAG_DATABASE_URL;
  if (fromEnv) return fromEnv;

  throw new Error("Missing DATABASE_URL(_FILE)");
}

// Reuso entre requests no Next (evita criar pool toda hora)
declare global {
  // eslint-disable-next-line no-var
  var __sisagPgPool: Pool | undefined;
}

export function getPgPool(): Pool {
  if (!global.__sisagPgPool) {
    global.__sisagPgPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.PG_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
      max: 5,
    });
  }
  return global.__sisagPgPool;
}
