import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await BookingService.create(body);

    if (!result.ok) {
      const status = result.error === "slot_taken" ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("BOOKINGS POST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: err?.message ?? "Error" },
      { status: 500 },
    );
  }
}
