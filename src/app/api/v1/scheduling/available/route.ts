//src/app/api/v1/scheduling/available/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { AvailabilityService } from "@/modules/availability/Availability.service";
import {
  DEFAULT_TIMEZONE,
  zonedDateTimeToUtcISOString,
  isoUtcToDateIsoInTz,
  isoUtcToHHMMInTz,
} from "@/lib/time";
import { getDb } from "@/lib/db";
import { professionals } from "@/drizzle/schema";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyIdParam = params.get("companyId") ?? "";
    const serviceId = params.get("serviceId") ?? "";
    const professionalId = params.get("professionalId") ?? "";
    let resourceId = params.get("resourceId") ?? "";

    const dateIso = params.get("date") ?? "";
    const limit = Number(params.get("limit") ?? "200");
    const stepMinutes = Number(params.get("stepMinutes") ?? "15");

    const durationMinutesRaw = params.get("durationMinutes");
    const durationMinutes = durationMinutesRaw
      ? Number(durationMinutesRaw)
      : undefined;

    if (!dateIso) {
      return NextResponse.json(
        { ok: false, error: "missing_date" },
        { status: 400 },
      );
    }

    if (professionalId && !uuidRe.test(professionalId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_professional_id" },
        { status: 400 },
      );
    }

    if (resourceId && !uuidRe.test(resourceId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_resource_id" },
        { status: 400 },
      );
    }

    if (companyIdParam && !uuidRe.test(companyIdParam)) {
      return NextResponse.json(
        { ok: false, error: "invalid_company_id" },
        { status: 400 },
      );
    }

    if (serviceId && !uuidRe.test(serviceId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_service_id" },
        { status: 400 },
      );
    }

    if (
      durationMinutes !== undefined &&
      (!Number.isFinite(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes > 24 * 60)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_duration_minutes" },
        { status: 400 },
      );
    }

    let companyId = companyIdParam;

    // Resolve resourceId e companyId via professionalId se necessário
    if (professionalId && (!resourceId || !companyId)) {
      const db = getDb();

      const rows = await db
        .select({
          resourceId: professionals.resourceId,
          companyId: professionals.companyId,
        })
        .from(professionals)
        .where(eq(professionals.id, professionalId))
        .limit(1);

      const professional = rows[0];

      if (!professional) {
        return NextResponse.json(
          { ok: false, error: "professional_not_found" },
          { status: 404 },
        );
      }

      if (!resourceId) {
        resourceId = professional.resourceId ?? "";
      }

      if (!companyId) {
        companyId = professional.companyId ?? "";
      }
    }

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "missing_company_id" },
        { status: 400 },
      );
    }

    if (!resourceId) {
      return NextResponse.json(
        { ok: false, error: "missing_resource_id" },
        { status: 400 },
      );
    }

    const startUtcIso = zonedDateTimeToUtcISOString(
      dateIso,
      "00:00",
      DEFAULT_TIMEZONE,
    );
    const startTime = new Date(startUtcIso);

    if (Number.isNaN(startTime.getTime())) {
      return NextResponse.json(
        { ok: false, error: "invalid_start_time" },
        { status: 400 },
      );
    }

    const result = await AvailabilityService.listSlots({
      companyId,
      serviceId: serviceId || undefined,
      resourceId,
      startTime,
      durationMinutes,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
      stepMinutes:
        Number.isFinite(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error ?? "availability_error",
          message: result.message ?? "Erro ao calcular disponibilidade.",
        },
        { status: 400 },
      );
    }

    const slots = (result.slots ?? [])
      .filter((s) => typeof s?.startTime === "string")
      .filter(
        (s) => isoUtcToDateIsoInTz(s.startTime, DEFAULT_TIMEZONE) === dateIso,
      )
      .map((s) => isoUtcToHHMMInTz(s.startTime, DEFAULT_TIMEZONE));

    return NextResponse.json(slots, { status: 200 });
  } catch (err: any) {
    console.error("SCHEDULING AVAILABLE GET ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Error",
      },
      { status: 500 },
    );
  }
}
