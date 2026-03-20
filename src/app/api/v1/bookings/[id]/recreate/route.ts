//src/app/api/v1/bookings/[id]/recreate/route.ts
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

    const result = await BookingService.recreateById({
      bookingId: id,
      newStartTime: body?.newStartTime,
      reason:
        typeof body?.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : null,
      actor: "admin",
    });

    if (!result.ok) {
      const status =
        result.error === "booking_not_found"
          ? 404
          : result.error === "slot_taken" ||
              result.error === "booking_not_recreatable" ||
              result.error === "booking_has_no_items" ||
              result.error === "service_not_found" ||
              result.error === "service_has_no_requirements" ||
              result.error === "resource_not_found" ||
              result.error === "invalid_start_time" ||
              result.error === "new_start_time_required" ||
              result.error === "booking_id_required"
            ? 400
            : 500;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(
      {
        ok: true,
        originalBookingId: result.originalBookingId,
        newBookingId: result.newBookingId,
        startTime: result.startTime,
        status: result.status,
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
