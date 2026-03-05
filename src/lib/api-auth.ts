import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";

export function requireSchedulingKey(req: Request) {
  const expected = readEnv("SCHEDULING_API_KEY");

  if (!expected) {
    // em dev pode deixar passar, mas em prod deve falhar
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 },
      );
    }
    return null;
  }

  const got =
    req.headers.get("x-scheduling-key") ||
    req.headers.get("X-Scheduling-Key") ||
    "";

  if (!got || got !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  return null;
}

// trigger 2026-03-05T14:25:17
