// src/app/api/v1/scheduling/book/route.ts
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { AvailabilityService } from "@/modules/availability/Availability.service";
import { DEFAULT_TIMEZONE, isoUtcToDateIsoInTz } from "@/lib/time";
import { slotKeyToBigint } from "@/lib/hash";
import { stableStringify, sha256Hex } from "@/lib/idempotency";
import { requireSchedulingKey } from "@/lib/api-auth";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const deny = requireSchedulingKey(req);
  if (deny) return deny;
  try {
    const body = await req.json().catch(() => ({}));

    const companyId = String(body?.companyId ?? "");
    const clientId = String(body?.clientId ?? "");
    const serviceId = String(body?.serviceId ?? "");
    const resourceId = String(body?.resourceId ?? "");
    const startTimeRaw = String(body?.startTime ?? ""); // ISO UTC (recomendado)

    // 1) Ler Idempotency-Key (header tem prioridade; body é fallback)
    const idempotencyKey =
      req.headers.get("Idempotency-Key") ||
      req.headers.get("idempotency-key") ||
      String(body?.idempotencyKey ?? "");

    if (!companyId || !clientId || !serviceId || !resourceId || !startTimeRaw) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_params",
          required: [
            "companyId",
            "clientId",
            "serviceId",
            "resourceId",
            "startTime",
          ],
        },
        { status: 400 },
      );
    }

    // (recomendado) exigir idempotency key no /book
    if (!idempotencyKey) {
      return NextResponse.json(
        { ok: false, error: "missing_idempotency_key" },
        { status: 400 },
      );
    }

    if (
      !uuidRe.test(companyId) ||
      !uuidRe.test(clientId) ||
      !uuidRe.test(serviceId) ||
      !uuidRe.test(resourceId)
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_uuid" },
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

    // 2) Montar request hash canônico (somente campos relevantes)
    // normalize startTime para ISO (evita "mesma request" com string diferente)
    const startIso = startTime.toISOString();
    const requestCanon = stableStringify({
      companyId,
      clientId,
      serviceId,
      resourceId,
      startTime: startIso,
    });
    const requestHash = sha256Hex(requestCanon);

    const db = getDb();

    // 🔒 Lock por (resourceId + startTime) pra evitar corrida / double-booking
    // (lock xact -> solta automaticamente no commit/rollback)
    const lockKey = slotKeyToBigint(resourceId, startIso);

    const scope = "scheduling.book";
    const ttlInterval = "7 days";

    const result = await (db as any).transaction(async (tx: any) => {
      // 0) lock por slot (garante exclusão mútua ao criar allocation)
      await tx.execute(sql`select pg_advisory_xact_lock(${lockKey});`);

      // A) Idempotency gate
      const rIdem = await tx.execute(sql`
        select id, status, request_hash as "requestHash", response_json as "responseJson"
        from idempotency_keys
        where company_id = ${companyId}::uuid
          and scope = ${scope}
          and key = ${idempotencyKey}
        limit 1;
      `);

      const idemRow = (rIdem as any)?.rows?.[0] as
        | {
            id: string;
            status: string;
            requestHash: string;
            responseJson: any;
          }
        | undefined;

      if (idemRow) {
        // mesma key, payload diferente -> conflito
        if (idemRow.requestHash !== requestHash) {
          return {
            ok: false as const,
            status: 409,
            error: "idempotency_conflict",
          };
        }

        // request já concluída -> retorna a mesma resposta
        if (idemRow.status === "completed" && idemRow.responseJson) {
          const resp = idemRow.responseJson;
          // garante forma mínima
          return { ...(resp as any), ok: true as const, status: 200 };
        }

        // ainda processando (ex.: corrida/retry quase simultâneo)
        if (idemRow.status === "processing") {
          return {
            ok: false as const,
            status: 409,
            error: "idempotency_processing",
          };
        }

        // failed -> permite tentar novamente com mesma key/payload (sobreescrevendo status depois)
        // (seguimos adiante)
      } else {
        // cria processing com TTL
        await tx.execute(sql`
          insert into idempotency_keys (
            company_id, scope, key, request_hash, status, expires_at, created_at, updated_at
          ) values (
            ${companyId}::uuid,
            ${scope},
            ${idempotencyKey},
            ${requestHash},
            'processing',
            now() + interval '${sql.raw(ttlInterval)}',
            now(),
            now()
          );
        `);
      }

      // B) Checar se o slot está disponível (mesma regra do WhatsApp)
      const avail = await AvailabilityService.listSlots({
        companyId,
        serviceId,
        resourceId,
        startTime,
        limit: 200,
        stepMinutes: 15,
      } as any);

      if (!avail?.ok) {
        // marca idempotency como failed
        await tx.execute(sql`
          update idempotency_keys
          set status = 'failed',
             response_json = ${JSON.stringify({
               ok: false,
               error:
                 avail && avail.ok === false
                   ? avail.error
                   : "availability_error",
             })}::jsonb,
              updated_at = now()
          where company_id = ${companyId}::uuid
            and scope = ${scope}
            and key = ${idempotencyKey};
        `);

        return {
          ok: false as const,
          status: 400,
          error:
            avail && avail.ok === false ? avail.error : "availability_error",
        };
      }

      const slots: any[] = avail.slots ?? [];
      const isAvailable = slots.some(
        (s) => typeof s?.startTime === "string" && s.startTime === startIso,
      );

      // Guard extra: não permitir "vazar" de dia no timezone
      const localDate = isoUtcToDateIsoInTz(startIso, DEFAULT_TIMEZONE);
      const endLocalDate = isoUtcToDateIsoInTz(startIso, DEFAULT_TIMEZONE);
      if (!isAvailable || localDate !== endLocalDate) {
        await tx.execute(sql`
          update idempotency_keys
          set status = 'failed',
              response_json = ${JSON.stringify({ ok: false, error: "slot_not_available" })}::jsonb,
              updated_at = now()
          where company_id = ${companyId}::uuid
            and scope = ${scope}
            and key = ${idempotencyKey};
        `);

        return { ok: false as const, status: 409, error: "slot_not_available" };
      }

      // C) Duração do serviço (fallback 30)
      const rDur = await tx.execute(sql`
        select duration_minutes as "durationMinutes"
        from services
        where id = ${serviceId}::uuid
          and company_id = ${companyId}::uuid
        limit 1;
      `);

      const durationMinutes =
        Number((rDur as any)?.rows?.[0]?.durationMinutes ?? 30) || 30;

      const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
      const endIso = endTime.toISOString();

      // D) Criar booking (PENDING)
      const rBooking = await tx.execute(sql`
        insert into bookings (company_id, client_id, start_time, status, created_at, updated_at)
        values (${companyId}::uuid, ${clientId}::uuid, ${startIso}::timestamptz, 'PENDING', now(), now())
        returning id;
      `);

      const bookingId = (rBooking as any)?.rows?.[0]?.id as string | undefined;
      if (!bookingId) {
        await tx.execute(sql`
          update idempotency_keys
          set status = 'failed',
              response_json = ${JSON.stringify({ ok: false, error: "booking_insert_failed" })}::jsonb,
              updated_at = now()
          where company_id = ${companyId}::uuid
            and scope = ${scope}
            and key = ${idempotencyKey};
        `);

        return {
          ok: false as const,
          status: 500,
          error: "booking_insert_failed",
        };
      }

      // E) Criar booking_item
      const rItem = await tx.execute(sql`
        insert into booking_items (booking_id, service_id, start_time, end_time, duration_minutes)
        values (
          ${bookingId}::uuid,
          ${serviceId}::uuid,
          ${startIso}::timestamptz,
          ${endIso}::timestamptz,
          ${durationMinutes}
        )
        returning id;
      `);

      const bookingItemId = (rItem as any)?.rows?.[0]?.id as string | undefined;
      if (!bookingItemId) {
        await tx.execute(sql`
          update idempotency_keys
          set status = 'failed',
              response_json = ${JSON.stringify({ ok: false, error: "booking_item_insert_failed" })}::jsonb,
              booking_id = ${bookingId}::uuid,
              resource_id = ${resourceId}::uuid,
              updated_at = now()
          where company_id = ${companyId}::uuid
            and scope = ${scope}
            and key = ${idempotencyKey};
        `);

        return {
          ok: false as const,
          status: 500,
          error: "booking_item_insert_failed",
        };
      }

      // F) Criar allocation (bloqueio do recurso)
      await tx.execute(sql`
        insert into booking_item_allocations (booking_item_id, resource_id, start_time, end_time)
        values (
          ${bookingItemId}::uuid,
          ${resourceId}::uuid,
          ${startIso}::timestamptz,
          ${endIso}::timestamptz
        );
      `);

      // G) Finalizar idempotency (completed) com response_json
      const responseJson = {
        ok: true,
        status: 200,
        bookingId,
        bookingItemId,
        durationMinutes,
        startTime: startIso,
        endTime: endIso,
      };

      await tx.execute(sql`
        update idempotency_keys
        set status = 'completed',
            response_json = ${JSON.stringify(responseJson)}::jsonb,
            booking_id = ${bookingId}::uuid,
            resource_id = ${resourceId}::uuid,
            updated_at = now()
        where company_id = ${companyId}::uuid
          and scope = ${scope}
          and key = ${idempotencyKey};
      `);

      return responseJson as any;
    });

    if (!result?.ok) {
      return NextResponse.json(
        { ok: false, error: (result as any)?.error ?? "book_failed" },
        { status: (result as any)?.status ?? 400 },
      );
    }

    // sucesso
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
