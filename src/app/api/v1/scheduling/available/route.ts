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

function jsonError(error: string, message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
    },
    { status },
  );
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyIdParam = params.get("companyId")?.trim() ?? "";
    const serviceId = params.get("serviceId")?.trim() ?? "";
    const professionalId = params.get("professionalId")?.trim() ?? "";
    let resourceId = params.get("resourceId")?.trim() ?? "";

    const dateIso = params.get("date")?.trim() ?? "";
    const limit = Number(params.get("limit") ?? "200");
    const stepMinutes = Number(params.get("stepMinutes") ?? "15");

    const durationMinutesRaw = params.get("durationMinutes");
    const durationMinutes =
      durationMinutesRaw && durationMinutesRaw.trim()
        ? Number(durationMinutesRaw)
        : undefined;

    if (!dateIso) {
      return jsonError(
        "missing_date",
        "Informe a data para calcular a disponibilidade.",
        400,
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return jsonError(
        "invalid_date",
        "A data deve estar no formato YYYY-MM-DD.",
        400,
      );
    }

    if (professionalId && !uuidRe.test(professionalId)) {
      return jsonError(
        "invalid_professional_id",
        "professionalId inválido.",
        400,
      );
    }

    if (resourceId && !uuidRe.test(resourceId)) {
      return jsonError("invalid_resource_id", "resourceId inválido.", 400);
    }

    if (companyIdParam && !uuidRe.test(companyIdParam)) {
      return jsonError("invalid_company_id", "companyId inválido.", 400);
    }

    if (serviceId && !uuidRe.test(serviceId)) {
      return jsonError("invalid_service_id", "serviceId inválido.", 400);
    }

    if (
      durationMinutes !== undefined &&
      (!Number.isFinite(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes > 24 * 60)
    ) {
      return jsonError(
        "invalid_duration_minutes",
        "durationMinutes inválido.",
        400,
      );
    }

    let companyId = companyIdParam;

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
        return jsonError(
          "professional_not_found",
          "Profissional não encontrado.",
          404,
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
      return jsonError(
        "missing_company_id",
        "Não foi possível identificar a empresa para calcular a disponibilidade.",
        400,
      );
    }

    if (!resourceId) {
      return jsonError(
        "missing_resource_id",
        "Não foi possível identificar o recurso para calcular a disponibilidade.",
        400,
      );
    }

    const startUtcIso = zonedDateTimeToUtcISOString(
      dateIso,
      "00:00",
      DEFAULT_TIMEZONE,
    );
    const startTime = new Date(startUtcIso);

    if (Number.isNaN(startTime.getTime())) {
      return jsonError(
        "invalid_start_time",
        "Não foi possível montar a data inicial da busca.",
        400,
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
      const message =
        "error" in result && typeof result.error === "string"
          ? result.error
          : "message" in result && typeof result.message === "string"
            ? result.message
            : "Não foi possível carregar os convites.";

      throw new Error(message);
    }

    const slots = Array.from(
      new Set(
        (result.slots ?? [])
          .filter((slot) => typeof slot?.startTime === "string")
          .filter(
            (slot) =>
              isoUtcToDateIsoInTz(slot.startTime, DEFAULT_TIMEZONE) === dateIso,
          )
          .map((slot) => isoUtcToHHMMInTz(slot.startTime, DEFAULT_TIMEZONE)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(
      {
        ok: true,
        date: dateIso,
        timezone: DEFAULT_TIMEZONE,
        companyId,
        serviceId: serviceId || null,
        professionalId: professionalId || null,
        resourceId,
        durationMinutes: durationMinutes ?? null,
        slots,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("SCHEDULING AVAILABLE GET ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno ao calcular disponibilidade.",
      },
      { status: 500 },
    );
  }
}
