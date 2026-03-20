//src/app/api/v1/bookings/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings } from "@/drizzle/schema";
import { BookingService } from "@/modules/bookings/Booking.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const rows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    const booking = rows[0];

    if (!booking) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_not_found",
          message: "Booking não encontrado.",
        },
        { status: 404 },
      );
    }

    const result = await BookingService.cancelById({
      bookingId: booking.id,
      companyId: booking.companyId,
      clientId: booking.clientId,
      actor: "admin",
    });

    if (!result.ok) {
      const status =
        result.error === "not_found_or_not_cancellable" ? 400 : 500;

      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: "Não foi possível cancelar o booking.",
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId: result.bookingId,
        startTime: result.startTime,
        message: "Booking cancelado com sucesso.",
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("BOOKING CANCEL POST ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro ao cancelar booking.",
      },
      { status: 500 },
    );
  }
}
