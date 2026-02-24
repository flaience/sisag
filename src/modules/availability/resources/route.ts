// src/app/api/v1/availability/resources/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  return NextResponse.json({
    ok: true,
    received: {
      companyId: params.get("companyId"),
      start: params.get("start"),
      end: params.get("end"),
    },
  });
}
