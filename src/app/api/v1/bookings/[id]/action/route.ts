// src/app/api/v1/bookings/[id]/action/route.ts
import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";
import { getBookingStateApiView } from "@/modules/bookings/Booking.state-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getResultStatus(result: { ok: boolean; error?: string }) {
  if (result.ok) return 200;

  switch (result.error) {
    case "booking_not_found":
    case "not_found":
    case "not_found_or_not_cancellable":
      return 404;

    case "action_required":
    case "invalid_action":
    case "booking_id_required":
    case "booking_missing_company_or_client":
      return 400;

    case "invalid_state_transition":
      return 409;

    default:
      return 400;
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const action = typeof body?.action === "string" ? body.action.trim() : "";
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_id_required",
          message: "Booking é obrigatório.",
        },
        { status: 400 },
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error: "action_required",
          message: "A ação é obrigatória.",
        },
        { status: 400 },
      );
    }

    if (action !== "confirm" && action !== "cancel") {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_action",
          message: "Ação inválida.",
        },
        { status: 400 },
      );
    }

    const journey = await BookingService.getJourney(id);

    if (!journey) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_not_found",
          message: "Booking não encontrado.",
        },
        { status: 404 },
      );
    }

    const state = getBookingStateApiView(journey.booking.status);

    if (!state) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_booking_state",
          message: "O estado do agendamento não é reconhecido.",
        },
        { status: 500 },
      );
    }

    if (!state.availableActions.includes(action)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_state_transition",
          state,
          message: "Esta ação não é permitida no estado atual do agendamento.",
        },
        { status: 409 },
      );
    }

    const companyId = journey.booking.companyId;
    const clientId = journey.booking.clientId;

    if (!companyId || !clientId) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_missing_company_or_client",
          message: "O booking não possui companyId ou clientId válidos.",
        },
        { status: 400 },
      );
    }

    if (action === "confirm") {
      const result = await BookingService.confirmById({
        bookingId: id,
        companyId,
        clientId,
        actor: "admin",
      });

      return NextResponse.json(result, {
        status: getResultStatus(result),
      });
    }

    const result = await BookingService.cancelById({
      bookingId: id,
      companyId,
      clientId,
      actor: "admin",
      reason,
    });

    return NextResponse.json(result, {
      status: getResultStatus(result),
    });
  } catch (err: any) {
    console.error("POST /api/v1/bookings/[id]/action error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno.",
      },
      { status: 500 },
    );
  }
}
