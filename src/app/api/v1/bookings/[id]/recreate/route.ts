import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings, bookingItems, bookingEvents } from "@/drizzle/schema";
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

    const newStartTime = body?.newStartTime;
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    if (!newStartTime) {
      return NextResponse.json(
        {
          ok: false,
          error: "new_start_time_required",
          message: "Novo horário é obrigatório.",
        },
        { status: 400 },
      );
    }

    const db = getDb();

    const bookingRows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        status: bookings.status,
        notes: bookings.notes,
        startTime: bookings.startTime,
      })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    const originalBooking = bookingRows[0];

    if (!originalBooking) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_not_found",
          message: "Booking original não encontrado.",
        },
        { status: 404 },
      );
    }

    const itemRows = await db
      .select({
        serviceId: bookingItems.serviceId,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, id))
      .limit(1);

    const firstItem = itemRows[0];

    if (!firstItem?.serviceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "service_not_found",
          message: "Serviço do booking original não encontrado.",
        },
        { status: 400 },
      );
    }

    const created = await BookingService.createAuto({
      companyId: originalBooking.companyId,
      clientId: originalBooking.clientId,
      serviceId: firstItem.serviceId,
      startTime: newStartTime,
      notes: originalBooking.notes ?? undefined,
    });

    if (!created.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: created.error,
          message: "Não foi possível criar um novo booking a partir deste.",
        },
        { status: 400 },
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(bookingEvents).values({
        companyId: originalBooking.companyId,
        bookingId: originalBooking.id,
        clientId: originalBooking.clientId,
        type: "booking.recreated_origin",
        actor: "admin",
        payload: {
          originalBookingId: originalBooking.id,
          originalStartTime: originalBooking.startTime,
          newBookingId: created.booking.id,
          newStartTime: created.booking.startTime,
          reason,
          recreatedAt: new Date().toISOString(),
        },
      });

      await tx.insert(bookingEvents).values({
        companyId: originalBooking.companyId,
        bookingId: created.booking.id,
        clientId: originalBooking.clientId,
        type: "booking.recreated_from_cancelled",
        actor: "admin",
        payload: {
          sourceBookingId: originalBooking.id,
          sourceBookingStartTime: originalBooking.startTime,
          newBookingId: created.booking.id,
          newStartTime: created.booking.startTime,
          reason,
          recreatedAt: new Date().toISOString(),
        },
      });
    });

    return NextResponse.json(
      {
        ok: true,
        originalBookingId: originalBooking.id,
        newBookingId: created.booking.id,
        startTime: created.booking.startTime,
        status: created.booking.status,
        message: "Novo booking criado com sucesso a partir do cancelado.",
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("BOOKING RECREATE POST ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro ao recriar booking.",
      },
      { status: 500 },
    );
  }
}
