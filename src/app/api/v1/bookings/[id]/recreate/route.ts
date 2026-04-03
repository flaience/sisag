import { NextRequest, NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { canRecreateBooking } from "@/lib/auth/bookingPermissions";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getErrorMessage(error: string) {
  switch (error) {
    case "booking_id_required":
      return "Booking é obrigatório.";
    case "new_start_time_required":
      return "Novo horário é obrigatório.";
    case "invalid_start_time":
      return "Novo horário inválido.";
    case "booking_not_found":
      return "Booking não encontrado.";
    case "booking_not_recreatable":
      return "Este booking não pode ser retomado.";
    case "booking_has_no_items":
      return "O booking original não possui itens.";
    case "service_not_found":
      return "Serviço não encontrado.";
    case "company_id_required":
      return "Empresa é obrigatória.";
    case "client_id_required":
      return "Cliente é obrigatório.";
    case "service_id_required":
      return "Serviço é obrigatório.";
    case "start_time_required":
      return "Novo horário é obrigatório.";
    case "service_has_no_requirements":
      return "O serviço não possui requisitos configurados.";
    case "resource_not_found":
      return "Não foi possível localizar recurso para o novo horário.";
    case "slot_taken":
      return "O horário selecionado não está disponível.";
    case "internal_error":
      return "Erro interno ao recriar booking.";
    default:
      return "Não foi possível recriar o booking.";
  }
}

function getStatus(error?: string) {
  switch (error) {
    case "booking_not_found":
      return 404;
    case "internal_error":
      return 500;
    default:
      return 400;
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);

    if (!authResult.ok) {
      return authResult.response;
    }

    const { auth } = authResult;

    if (!canRecreateBooking(auth.role)) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: "Você não tem permissão para recriar bookings.",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const newStartTime =
      typeof body?.newStartTime === "string" ? body.newStartTime.trim() : "";

    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    const result = await BookingService.recreateById({
      bookingId: id,
      companyId: auth.companyId,
      newStartTime,
      actor: "admin",
      reason,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: result.message ?? getErrorMessage(result.error),
        },
        { status: getStatus(result.error) },
      );
    }

    return NextResponse.json({
      ok: true,
      originalBookingId: result.originalBookingId,
      newBookingId: result.newBookingId,
      startTime: result.startTime,
      status: result.status,
      message: "Novo booking criado com sucesso.",
    });
  } catch (err: any) {
    console.error("POST /api/v1/bookings/[id]/recreate error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno ao recriar booking.",
      },
      { status: 500 },
    );
  }
}
