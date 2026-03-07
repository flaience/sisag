import { NextResponse } from "next/server";
import { readEnv } from "@/lib/env";

export function requireSchedulingKey(req: Request) {
  const expected = readEnv("SCHEDULING_API_KEY");

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "server_misconfigured" },
        { status: 500 },
      );
    }
    return null;
  }

  const got = req.headers.get("x-scheduling-key") || "";

  if (!got || got !== expected) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  return null;
}
