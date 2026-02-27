// src/app/api/v1/availability/slots/route.ts
import { NextResponse } from "next/server";
import { AvailabilityService } from "@/modules/availability/Availability.service";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyId = params.get("companyId") ?? "";
    const serviceId = params.get("serviceId") ?? "";

    // ✅ agora é startTime (ex: 2026-03-03T14:00:00-03:00 ou 2026-03-03T17:00:00.000Z)
    const startTimeRaw = params.get("startTime") ?? "";
    const resourceId = params.get("resourceId") ?? undefined;

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

    const result = await AvailabilityService.listSlots({
      companyId,
      serviceId,
      startTime,
      resourceId,
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
