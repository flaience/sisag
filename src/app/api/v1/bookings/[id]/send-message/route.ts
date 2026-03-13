import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const type = body?.type as "pre" | "post" | undefined;

    if (!type || !["pre", "post"].includes(type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_type",
          message: "Tipo deve ser 'pre' ou 'post'",
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
        },
        { status: 404 },
      );
    }

    const phone = journey.client.phone;
    const companyId = journey.booking.companyId;

    if (!phone) {
      return NextResponse.json(
        {
          ok: false,
          error: "client_without_phone",
        },
        { status: 400 },
      );
    }

    const message =
      type === "pre"
        ? journey.suggestedPreMessage
        : journey.suggestedPostMessage;

    if (!message) {
      return NextResponse.json(
        {
          ok: false,
          error: "message_not_found",
        },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const internalSecret = process.env.INTERNAL_API_SECRET;

    if (!internalSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "internal_secret_missing",
        },
        { status: 500 },
      );
    }

    const sendResponse = await fetch(`${baseUrl}/api/internal/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": internalSecret,
      },
      body: JSON.stringify({
        companyId,
        toPhone: phone,
        text: message,
      }),
    });

    const result = await sendResponse.json().catch(() => null);

    if (!sendResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "send_failed",
          message: result?.error ?? "Erro ao enviar mensagem",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      type,
      result,
    });
  } catch (err: any) {
    console.error("SEND MESSAGE ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro interno",
      },
      { status: 500 },
    );
  }
}
