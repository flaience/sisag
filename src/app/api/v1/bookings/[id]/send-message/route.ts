import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { bookings, clients } from "@/drizzle/schema";
import { publishWhatsAppSendRequested } from "@/modules/whatsapp/whatsapp-send.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json().catch(() => null);
    const message = body?.message;
    const origin = body?.origin ?? "journey_suggested";

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Message is required" },
        { status: 400 },
      );
    }

    const db = getDb();

    const bookingRows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.id))
      .limit(1);

    const booking = bookingRows[0];

    if (!booking) {
      return NextResponse.json(
        { ok: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    const clientRows = await db
      .select()
      .from(clients)
      .where(eq(clients.id, booking.clientId))
      .limit(1);

    const client = clientRows[0];

    const toPhone = client?.phoneE164 ?? null;

    if (!toPhone) {
      return NextResponse.json(
        { ok: false, error: "Client phone not found" },
        { status: 400 },
      );
    }

    await publishWhatsAppSendRequested({
      bookingId: booking.id,
      companyId: booking.companyId,
      clientId: booking.clientId ?? null,
      toPhone,
      message,
      origin,
      metadata: {
        source: "journey",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Mensagem enviada para a fila de processamento.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erro ao preparar envio da mensagem." },
      { status: 500 },
    );
  }
}
