// src/app/api/v1/scheduling/available/route.ts

import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";

import { professionals } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import {
  DEFAULT_TIMEZONE,
  isoUtcToDateIsoInTz,
  isoUtcToHHMMInTz,
  zonedDateTimeToUtcISOString,
} from "@/lib/time";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { FindAvailableSlotsUseCase } from "@/platform/use-cases/scheduling";

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

function addDaysToDateIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiRole(req, ["owner", "admin", "staff"]);
    if (auth.ok === false) return auth.response;
    const companyId = auth.auth.companyId;
    const params = req.nextUrl.searchParams;

    const serviceId = params.get("serviceId")?.trim() ?? "";
    const professionalId = params.get("professionalId")?.trim() ?? "";
    const unitId = params.get("unitId")?.trim() ?? "";

    let resourceId = params.get("resourceId")?.trim() ?? "";

    const dateIso = params.get("date")?.trim() ?? "";

    /*
     * Mantidos por compatibilidade com o contrato anterior da rota.
     */
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

    if (unitId && !uuidRe.test(unitId)) {
      return jsonError("invalid_unit_id", "unitId inválido.", 400);
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

    /*
     * Mantém a mesma resolução feita pela versão anterior da rota.
     * Nesta primeira migração, o Adapter não repetirá essa consulta.
     */
    if (professionalId && !resourceId) {
      const db = getDb();

      const rows = await db
        .select({
          resourceId: professionals.resourceId,
          companyId: professionals.companyId,
        })
        .from(professionals)
        .where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId)))
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

    const nextDateIso = addDaysToDateIso(dateIso, 1);

    const endUtcIso = zonedDateTimeToUtcISOString(
      nextDateIso,
      "00:00",
      DEFAULT_TIMEZONE,
    );

    const context = createOperationalUseCaseContext({
      companyId,
      actor: {
        type: "api",
        id: "api-v1-scheduling-available",
        name: "Public scheduling availability route",
      },
    });

    const adapter = new SisagSchedulingAdapter();
    const useCase = new FindAvailableSlotsUseCase(adapter);

    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : 200;

    const normalizedStepMinutes =
      Number.isFinite(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15;

    console.info("SCHEDULING AVAILABLE USE CASE START:", {
      correlationId: context.correlationId,
      companyId,
      serviceId: serviceId || null,
      professionalId: professionalId || null,
      resourceId,
      dateFrom: startUtcIso,
      dateTo: endUtcIso,
      durationMinutes: durationMinutes ?? null,
      limit: normalizedLimit,
      stepMinutes: normalizedStepMinutes,
    });

    const platformResult = await useCase.execute(context, {
      professionalId: professionalId || undefined,
      unitId: unitId || undefined,
      serviceId: serviceId || undefined,
      resourceId,
      dateFrom: startUtcIso,
      dateTo: endUtcIso,
      durationMinutes,
      limit: normalizedLimit,
      stepMinutes: normalizedStepMinutes,
    });

    /*
     * Mantém o comportamento público anterior:
     * falhas internas da disponibilidade chegam ao catch e retornam HTTP 500.
     */
    if (platformResult.ok === false) {
      console.error("SCHEDULING AVAILABLE USE CASE FAILURE:", {
        correlationId: context.correlationId,
        code: platformResult.error.code,
        message: platformResult.error.message,
      });

      throw new Error(platformResult.error.message);
    }

    const slots = Array.from(
      new Set(
        platformResult.value
          .filter((slot) => typeof slot.startsAt === "string")
          .filter(
            (slot) =>
              isoUtcToDateIsoInTz(slot.startsAt, DEFAULT_TIMEZONE) === dateIso,
          )
          .map((slot) => isoUtcToHHMMInTz(slot.startsAt, DEFAULT_TIMEZONE)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    console.info("SCHEDULING AVAILABLE USE CASE SUCCESS:", {
      correlationId: context.correlationId,
      slotCount: slots.length,
    });

    /*
     * O contrato público de sucesso permanece igual.
     */
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
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao calcular disponibilidade.";

    console.error("SCHEDULING AVAILABLE GET ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message,
      },
      { status: 500 },
    );
  }
}
