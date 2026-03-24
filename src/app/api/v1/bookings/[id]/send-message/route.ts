// src/app/api/v1/bookings/[id]/send-message/route.ts
import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getErrorMessage(error: string) {
  switch (error) {
    case "booking_not_found":
      return "Booking não encontrado.";
    case "missing_phone":
      return "Cliente sem telefone para envio.";
    case "message_not_available":
      return "Não foi possível montar a mensagem.";
    case "internal_error":
      return "Erro interno ao enviar mensagem.";
    default:
      return "Não foi possível enviar a mensagem.";
  }
}

function getStatus(error?: string) {
  switch (error) {
    case "booking_not_found":
      return 404;
    case "missing_phone":
    case "message_not_available":
      return 400;
    case "internal_error":
      return 500;
    default:
      return 400;
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const type =
      body?.type === "pre" || body?.type === "post" ? body.type : undefined;

    const text =
      typeof body?.text === "string" && body.text.trim()
        ? body.text.trim()
        : undefined;

    const result = await BookingService.sendJourneyMessage({
      bookingId: id,
      type,
      text,
      actor: "admin",
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
      bookingId: result.bookingId,
      clientId: result.clientId,
      toPhone: result.toPhone,
      message: result.message ?? "Mensagem enviada para o fluxo do SISAG.",
    });
  } catch (err: any) {
    console.error("POST /api/v1/bookings/[id]/send-message error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno ao enviar mensagem.",
      },
      { status: 500 },
    );
  }
}
