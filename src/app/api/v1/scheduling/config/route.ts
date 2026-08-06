//src/app/api/v1/scheduling/config/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated_endpoint",
      message: "Use /api/v1/settings/scheduling.",
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
