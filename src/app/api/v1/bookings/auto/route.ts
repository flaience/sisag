//src/app/api/v1/bookings/auto/route.ts
import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await BookingService.createAuto({
      companyId: body.companyId,
      clientId: body.clientId,
      serviceId: body.serviceId,
      startTime: body.startTime,
      notes: body.notes ?? null,
    });

    if (!result.ok) {
      const status =
        result.error === "slot_taken"
          ? 409
          : result.error === "internal_error"
            ? 500
            : 400;

      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("BOOKINGS AUTO POST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
