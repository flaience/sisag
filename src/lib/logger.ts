// src/lib/logger.ts
type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const LEVELS: Record<Exclude<LogLevel, "silent">, number> = {
  error: 10,
  warn: 20,
  info: 30,
  debug: 40,
};

function getLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase();
  if (
    raw === "silent" ||
    raw === "error" ||
    raw === "warn" ||
    raw === "info" ||
    raw === "debug"
  ) {
    return raw;
  }
  // default: menos barulho em prod, mais info em dev
  return process.env.NODE_ENV === "production" ? "warn" : "info";
}

const current = getLevel();
const currentNum = current === "silent" ? 0 : LEVELS[current];

function can(level: Exclude<LogLevel, "silent">) {
  return current !== "silent" && LEVELS[level] <= currentNum;
}

function fmt(meta?: unknown) {
  if (!meta) return "";
  try {
    return typeof meta === "string" ? meta : JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

export const logger = {
  error(msg: string, meta?: unknown) {
    if (!can("error")) return;
    console.error(`[error] ${msg}${meta ? " " + fmt(meta) : ""}`);
  },
  warn(msg: string, meta?: unknown) {
    if (!can("warn")) return;
    console.warn(`[warn] ${msg}${meta ? " " + fmt(meta) : ""}`);
  },
  info(msg: string, meta?: unknown) {
    if (!can("info")) return;
    console.info(`[info] ${msg}${meta ? " " + fmt(meta) : ""}`);
  },
  debug(msg: string, meta?: unknown) {
    if (!can("debug")) return;
    console.log(`[debug] ${msg}${meta ? " " + fmt(meta) : ""}`);
  },
};
