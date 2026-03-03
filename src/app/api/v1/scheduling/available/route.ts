// src/app/api/v1/scheduling/available/route.ts
import { NextResponse } from "next/server";
import { AvailabilityService } from "@/modules/availability/Availability.service";
import {
  DEFAULT_TIMEZONE,
  zonedDateTimeToUtcISOString,
  isoUtcToDateIsoInTz,
  isoUtcToHHMMInTz,
} from "@/lib/time";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;

    const companyId = params.get("companyId") ?? "";
    const serviceId = params.get("serviceId") ?? "";

    // ✅ novo (resourceId) + legado (professionalId)
    const resourceId =
      params.get("resourceId") || params.get("professionalId") || "";

    const dateIso = params.get("date") ?? ""; // YYYY-MM-DD

    const limit = Number(params.get("limit") ?? "200");
    const stepMinutes = Number(params.get("stepMinutes") ?? "15");

    // ✅ agora resourceId entra como obrigatório no lugar de professionalId
    if (!companyId || !serviceId || !resourceId || !dateIso) {
      return NextResponse.json(
        { ok: false, error: "missing_params" },
        { status: 400 },
      );
    }

    // ✅ valida uuid do resourceId (não professionalId)
    if (
      !uuidRe.test(companyId) ||
      !uuidRe.test(serviceId) ||
      !uuidRe.test(resourceId)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_uuid" },
        { status: 400 },
      );
    }

    // dateIso é o dia local. Começa em 00:00 local e converte para UTC ISO.
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

    // chama AvailabilityService (mesma regra do WhatsApp)
    const r = await AvailabilityService.listSlots({
      companyId,
      serviceId,
      resourceId, // ✅ agora usa a variável padronizada
      startTime,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
      stepMinutes:
        Number.isFinite(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15,
    } as any);

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: r.error ?? "availability_error" },
        { status: 400 },
      );
    }

    // filtra para garantir que o slot cai no dateIso no fuso local
    const slots = (r.slots ?? [])
      .filter((s: any) => typeof s?.startTime === "string")
      .filter(
        (s: any) =>
          isoUtcToDateIsoInTz(s.startTime, DEFAULT_TIMEZONE) === dateIso,
      )
      .map((s: any) => isoUtcToHHMMInTz(s.startTime, DEFAULT_TIMEZONE));

    return NextResponse.json(slots, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
