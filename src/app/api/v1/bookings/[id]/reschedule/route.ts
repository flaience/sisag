//src/app/api/v1/bookings/[id]/reschedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { canRescheduleBooking } from "@/lib/auth/bookingPermissions";
import { getActionResultMessage } from "@/lib/ui/actionResult";

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
    case "booking_not_reschedulable":
      return "Este booking não pode ser reagendado.";
    case "booking_has_no_items":
      return "O booking não possui itens para reagendamento.";
    case "service_not_found":
      return "Serviço não encontrado.";
    case "service_has_no_requirements":
      return "O serviço não possui requisitos configurados.";
    case "resource_not_found":
      return "Não foi possível localizar recurso para o novo horário.";
    case "slot_taken":
      return "O horário selecionado não está disponível.";
    case "internal_error":
      return "Erro interno ao reagendar booking.";
    default:
      return "Não foi possível reagendar o booking.";
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

    if (authResult.ok === false) {
      return authResult.response;
    }

    const { auth } = authResult;

    if (!canRescheduleBooking(auth.role)) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          message: "Você não tem permissão para reagendar bookings.",
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

    const result = await BookingService.rescheduleById({
      bookingId: id,
      companyId: auth.companyId,
      newStartTime,
      actor: "admin",
      reason,
    });

    if (!result.ok) {
      const errorMessage = getActionResultMessage(
        result,
        "Não foi possível concluir a operação.",
      );

      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
        },
        { status: getStatus(errorMessage) },
      );
    }

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      oldStartTime: result.oldStartTime,
      newStartTime: result.newStartTime,
      status: result.status,
      message: "Booking reagendado com sucesso.",
    });
  } catch (err: any) {
    console.error("POST /api/v1/bookings/[id]/reschedule error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno ao reagendar booking.",
      },
      { status: 500 },
    );
  }
}
