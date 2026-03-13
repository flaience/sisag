import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, bookingItems, clients, services } from "@/drizzle/schema";
import { BookingService } from "@/modules/bookings/Booking.service";

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        clientName: clients.name,
        startTime: bookings.startTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,

        bookingItemId: bookingItems.id,
        serviceName: services.name,
      })
      .from(bookings)
      .leftJoin(clients, eq(clients.id, bookings.clientId))
      .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .leftJoin(services, eq(services.id, bookingItems.serviceId))
      .orderBy(desc(bookings.createdAt));

    const grouped = new Map<
      string,
      {
        id: string;
        companyId: string;
        clientId: string;
        clientName: string | null;
        startTime: Date;
        status: string;
        notes: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        primaryServiceName: string | null;
        itemsCount: number;
      }
    >();

    for (const row of rows) {
      const existing = grouped.get(row.id);

      if (!existing) {
        grouped.set(row.id, {
          id: row.id,
          companyId: row.companyId,
          clientId: row.clientId,
          clientName: row.clientName ?? null,
          startTime: row.startTime,
          status: row.status,
          notes: row.notes,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          primaryServiceName: row.serviceName ?? null,
          itemsCount: row.bookingItemId ? 1 : 0,
        });
        continue;
      }

      if (!existing.primaryServiceName && row.serviceName) {
        existing.primaryServiceName = row.serviceName;
      }

      if (row.bookingItemId) {
        existing.itemsCount += 1;
      }
    }

    return NextResponse.json(Array.from(grouped.values()));
  } catch (err: any) {
    console.error("BOOKINGS LIST GET ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Erro ao listar bookings.",
      },
      { status: 400 },
    );
  }
}

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
