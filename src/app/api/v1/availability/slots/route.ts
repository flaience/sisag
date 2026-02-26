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
    const date = params.get("date") ?? "";
    const resourceId = params.get("resourceId") ?? undefined;

    if (!companyId || !serviceId || !date) {
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

    // date esperado: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { ok: false, error: "invalid_date_format" },
        { status: 400 },
      );
    }

    const result = await AvailabilityService.listSlots({
      companyId,
      serviceId,
      date,
      resourceId,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AVAILABILITY SLOTS GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
