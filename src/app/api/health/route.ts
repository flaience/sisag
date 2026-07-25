//src/app/api/health/route.ts
//teste

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "sisag",
      ts: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "unknown",
    },
    { status: 200 },
  );
}
