import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const READY_DATABASE_TIMEOUT_MS = Number(
  process.env.READY_DATABASE_TIMEOUT_MS ?? "4000",
);

async function checkDatabaseWithTimeout() {
  let timeout: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      getPool().query("select 1 as ok"),

      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("database_readiness_timeout"));
        }, READY_DATABASE_TIMEOUT_MS);

        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function GET() {
  const startedAt = Date.now();

  try {
    await checkDatabaseWithTimeout();

    return NextResponse.json(
      {
        ok: true,
        ready: true,
        database: "available",
        latencyMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "database_unavailable";

    console.error("[READINESS_DATABASE_FAILED]", {
      message,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        ok: false,
        ready: false,
        database: "unavailable",
        error:
          message === "database_readiness_timeout"
            ? "database_timeout"
            : "database_unavailable",
        latencyMs: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
