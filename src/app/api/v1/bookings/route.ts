// src/app/api/v1/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { BookingCommandInputSchema } from "@/modules/bookings/BookingCommand.schema";
import { executeBookingCommand } from "@/modules/bookings/BookingCommand.service";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
  clients,
  professionals,
  resources,
  services,
} from "@/drizzle/schema";

function getCreateErrorMessage(error: string) {
  switch (error) {
    case "company_id_required":
      return "Empresa é obrigatória.";
    case "client_id_required":
      return "Cliente é obrigatório.";
    case "service_id_required":
      return "Serviço é obrigatório.";
    case "start_time_required":
      return "Data e horário são obrigatórios.";
    case "service_not_found":
      return "Serviço não encontrado.";
    case "invalid_start_time":
      return "Data ou horário inválidos.";
    case "service_has_no_requirements":
      return "O serviço não possui requisitos configurados.";
    case "professional_not_found":
      return "Profissional não encontrado.";
    case "professional_has_no_resource":
      return "O profissional selecionado não possui recurso vinculado.";
    case "professional_not_compatible":
      return "O profissional selecionado não é compatível com este serviço.";
    case "resource_not_found":
      return "Não foi possível localizar recurso para este atendimento.";
    case "idempotency_conflict":
      return "O identificador desta tentativa já foi usado com outros dados.";
    case "request_in_progress":
      return "Este agendamento já está sendo processado.";
    case "slot_taken":
      return "O horário selecionado não está mais disponível.";
    case "internal_error":
      return "Erro interno ao criar booking.";
    default:
      return "Não foi possível criar o booking.";
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
    if (authResult.ok === false) return authResult.response;
    const companyId = authResult.auth.companyId;
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status")?.trim() ?? "ALL";
    const q = searchParams.get("q")?.trim() ?? "";
    const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
    const dateTo = searchParams.get("dateTo")?.trim() ?? "";

    const filters = [eq(bookings.companyId, companyId)];

    if (status && status !== "ALL") {
      filters.push(eq(bookings.status, status));
    }

    if (dateFrom) {
      const fromDate = new Date(`${dateFrom}T00:00:00`);
      if (!Number.isNaN(fromDate.getTime())) {
        filters.push(gte(bookings.startTime, fromDate));
      }
    }

    if (dateTo) {
      const toDate = new Date(`${dateTo}T23:59:59.999`);
      if (!Number.isNaN(toDate.getTime())) {
        filters.push(lte(bookings.startTime, toDate));
      }
    }

    const baseRows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        startTime: bookings.startTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        clientName: clients.name,
      })
      .from(bookings)
      .leftJoin(clients, eq(clients.id, bookings.clientId))
      .where(and(...filters))
      .orderBy(desc(bookings.startTime));

    if (baseRows.length === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    const bookingIds = baseRows.map((row) => row.id);

    const itemRows = await db
      .select({
        id: bookingItems.id,
        bookingId: bookingItems.bookingId,
        serviceId: bookingItems.serviceId,
        serviceName: services.name,
        durationMinutes: bookingItems.durationMinutes,
        endTime: bookingItems.endTime,
        startTime: bookingItems.startTime,
        createdAt: bookingItems.createdAt,
      })
      .from(bookingItems)
      .leftJoin(services, eq(services.id, bookingItems.serviceId))
      .where(inArray(bookingItems.bookingId, bookingIds));

    const firstItemByBooking = new Map<string, (typeof itemRows)[number]>();

    for (const item of itemRows) {
      const current = firstItemByBooking.get(item.bookingId);

      if (!current) {
        firstItemByBooking.set(item.bookingId, item);
        continue;
      }

      const currentTime = current.startTime
        ? new Date(current.startTime).getTime()
        : Number.POSITIVE_INFINITY;
      const itemTime = item.startTime
        ? new Date(item.startTime).getTime()
        : Number.POSITIVE_INFINITY;

      if (itemTime < currentTime) {
        firstItemByBooking.set(item.bookingId, item);
      }
    }

    const firstItemIds = Array.from(firstItemByBooking.values()).map(
      (item) => item.id,
    );

    let allocationsByItemId = new Map<
      string,
      {
        bookingItemId: string;
        resourceId: string;
      }
    >();

    if (firstItemIds.length > 0) {
      const allocationRows = await db
        .select({
          bookingItemId: bookingItemAllocations.bookingItemId,
          resourceId: bookingItemAllocations.resourceId,
          createdAt: bookingItemAllocations.createdAt,
        })
        .from(bookingItemAllocations)
        .where(inArray(bookingItemAllocations.bookingItemId, firstItemIds));

      for (const allocation of allocationRows) {
        if (!allocationsByItemId.has(allocation.bookingItemId)) {
          allocationsByItemId.set(allocation.bookingItemId, {
            bookingItemId: allocation.bookingItemId,
            resourceId: allocation.resourceId,
          });
        }
      }
    }

    const resourceIds = Array.from(allocationsByItemId.values()).map(
      (row) => row.resourceId,
    );

    const professionalByResourceId = new Map<
      string,
      {
        id: string;
        name: string | null;
        resourceId: string | null;
      }
    >();

    if (resourceIds.length > 0) {
      const professionalRows = await db
        .select({
          id: professionals.id,
          name: professionals.name,
          resourceId: professionals.resourceId,
        })
        .from(professionals)
        .where(inArray(professionals.resourceId, resourceIds));

      for (const professional of professionalRows) {
        if (
          professional.resourceId &&
          !professionalByResourceId.has(professional.resourceId)
        ) {
          professionalByResourceId.set(professional.resourceId, professional);
        }
      }
    }

    let items = baseRows.map((row) => {
      const firstItem = firstItemByBooking.get(row.id) ?? null;
      const firstAllocation = firstItem
        ? (allocationsByItemId.get(firstItem.id) ?? null)
        : null;
      const professional = firstAllocation?.resourceId
        ? (professionalByResourceId.get(firstAllocation.resourceId) ?? null)
        : null;

      return {
        id: row.id,
        companyId: row.companyId,
        clientId: row.clientId,
        startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
        endTime: firstItem?.endTime
          ? new Date(firstItem.endTime).toISOString()
          : null,
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        clientName: row.clientName ?? null,
        serviceId: firstItem?.serviceId ?? null,
        serviceName: firstItem?.serviceName ?? null,
        durationMinutes: firstItem?.durationMinutes ?? null,
        professionalId: professional?.id ?? null,
        professionalName: professional?.name ?? null,
      };
    });

    if (q) {
      const qLower = q.toLowerCase();

      items = items.filter((row) => {
        return [
          row.clientName,
          row.serviceName,
          row.professionalName,
          row.notes,
        ].some((value) => value?.toLowerCase().includes(qLower));
      });
    }

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (err: any) {
    console.error("GET /api/v1/bookings error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro ao listar bookings.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]); if (authResult.ok === false) return authResult.response;
    const body = await req.json().catch(() => null); const headerKey = req.headers.get("idempotency-key")?.trim();
    const parsed = BookingCommandInputSchema.safeParse({ ...body, requestId: headerKey || body?.requestId });
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_booking_command", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const result = await executeBookingCommand({ companyId: authResult.auth.companyId, userId: authResult.auth.userId }, parsed.data);
    if (result.ok === false) return NextResponse.json({ ok: false, error: result.error, message: getCreateErrorMessage(result.error) }, { status: result.error === "internal_error" ? 500 : result.error === "request_in_progress" ? 409 : 400 });
    return NextResponse.json({ ok: true, booking: result.booking, message: "Agendamento criado com sucesso." }, { status: 201 });
  } catch (err: any) { console.error("POST /api/v1/bookings error:", err); return NextResponse.json({ ok: false, error: "internal_error", message: err?.message ?? "Erro interno ao criar agendamento." }, { status: 500 }); }
}
