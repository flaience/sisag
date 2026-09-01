import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { bookings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { BookingService } from "@/modules/bookings/Booking.service";
import { BookingOperationalLifecycleService } from "@/modules/bookings/BookingOperationalLifecycle.service";
import { bookingLifecycleActions, canApplyBookingAction, isPersistedBookingState, type BookingLifecycleAction } from "@/modules/bookings/Booking.state-contract";

type RouteContext = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, context: RouteContext) {
  const authResult = await requireApiRole(req, ["owner", "admin", "staff"]);
  if (authResult.ok === false) return authResult.response;
  const { auth } = authResult;
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as BookingLifecycleAction;
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  if (!bookingLifecycleActions.includes(action)) return NextResponse.json({ ok: false, error: "invalid_action", message: "Ação inválida." }, { status: 400 });
  if (action === "reschedule") return NextResponse.json({ ok: false, error: "dedicated_route_required", message: "Use o fluxo de reagendamento para escolher o novo horário." }, { status: 400 });
  const rows = await getDb().select({ id: bookings.id, clientId: bookings.clientId, status: bookings.status }).from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.companyId, auth.companyId))).limit(1);
  const booking = rows[0];
  if (!booking) return NextResponse.json({ ok: false, error: "booking_not_found" }, { status: 404 });
  if (!isPersistedBookingState(booking.status) || !canApplyBookingAction(booking.status, action)) return NextResponse.json({ ok: false, error: "invalid_state_transition", currentStatus: booking.status }, { status: 409 });
  let result;
  if (action === "confirm") result = await BookingService.confirmById({ companyId: auth.companyId, clientId: booking.clientId, bookingId: id, actor: "admin" });
  else if (action === "cancel") result = await BookingService.cancelById({ companyId: auth.companyId, clientId: booking.clientId, bookingId: id, actor: "admin", reason });
  else result = await BookingOperationalLifecycleService.apply({ companyId: auth.companyId, bookingId: id, action, actorId: auth.userId, reason });
  if (!result.ok) return NextResponse.json(result, { status: result.error === "booking_not_found" ? 404 : 409 });
  return NextResponse.json(result);
}
