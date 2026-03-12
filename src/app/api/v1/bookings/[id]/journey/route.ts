import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const data = await BookingService.getJourney(id);

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: "Booking não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (err: any) {
    console.error("BOOKING JOURNEY GET ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao carregar jornada do booking.",
      },
      { status: 400 },
    );
  }
}
