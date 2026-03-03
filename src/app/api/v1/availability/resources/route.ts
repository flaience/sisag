// src/app/api/v1/availability/resources/route.ts

import { NextResponse } from "next/server";
import { AvailabilityService } from "@/modules/availability/Availability.service";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyId = params.get("companyId") ?? "";
    const start = params.get("start") ?? "";
    const end = params.get("end") ?? "";
    const typeId = params.get("typeId") ?? undefined;

    if (!companyId || !start || !end) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      return NextResponse.json(
        { ok: false, error: "invalid_datetime" },
        { status: 400 },
      );
    }

    const busy = await AvailabilityService.listBusyResources({
      companyId,
      startTime,
      endTime,
      typeId,
    });

    return NextResponse.json({ ok: true, busyResourceIds: busy });
  } catch (err: any) {
    console.error("AVAILABILITY GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
