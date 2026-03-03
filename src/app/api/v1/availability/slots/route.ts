// src/app/api/v1/availability/slots/route.ts
// testes de disponibilidade

import { NextResponse } from "next/server";
import { AvailabilityService } from "@/modules/availability/Availability.service";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyId = params.get("companyId") ?? "";
    const serviceId = params.get("serviceId") ?? "";
    const startTimeRaw = params.get("startTime") ?? ""; // ISO (Z ou com offset)
    const resourceId = params.get("resourceId") ?? undefined;

    const limitRaw = params.get("limit");
    const stepMinutesRaw = params.get("stepMinutes");

    if (!companyId || !serviceId || !startTimeRaw) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    if (!uuidRe.test(companyId) || !uuidRe.test(serviceId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_uuid" },
        { status: 400 },
      );
    }

    if (resourceId && !uuidRe.test(resourceId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_resource_id" },
        { status: 400 },
      );
    }

    const startTime = new Date(startTimeRaw);
    if (Number.isNaN(startTime.getTime())) {
      return NextResponse.json(
        { ok: false, error: "invalid_start_time" },
        { status: 400 },
      );
    }

    const limit = limitRaw ? Number(limitRaw) : undefined;
    const stepMinutes = stepMinutesRaw ? Number(stepMinutesRaw) : undefined;

    if (
      limit !== undefined &&
      (!Number.isFinite(limit) || limit <= 0 || limit > 2000)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_limit" },
        { status: 400 },
      );
    }

    if (
      stepMinutes !== undefined &&
      (!Number.isFinite(stepMinutes) || stepMinutes <= 0 || stepMinutes > 180)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_step_minutes" },
        { status: 400 },
      );
    }

    const result = await AvailabilityService.listSlots({
      companyId,
      serviceId,
      startTime,
      resourceId,
      limit,
      stepMinutes,
    } as any);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err: any) {
    console.error("AVAILABILITY SLOTS GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
