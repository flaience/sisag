import { and, eq, inArray } from "drizzle-orm";
import { bookingEvents, bookings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingReminderPlannerService } from "@/modules/automation/BookingReminderPlanner.service";
import { BookingFollowupPlannerService } from "@/modules/automation/BookingFollowupPlanner.service";
import { applyBookingAction, getBookingSourceStates, type BookingLifecycleAction } from "./Booking.state-contract";

type OperationalAction = Extract<BookingLifecycleAction, "arrive" | "start" | "complete" | "no_show">;
const eventByAction = {
  arrive: "booking.arrived",
  start: "booking.started",
  complete: "booking.completed",
  no_show: "booking.no_show",
} as const;
const timestampByAction = {
  arrive: (at: Date) => ({ arrivedAt: at }),
  start: (at: Date) => ({ startedAt: at }),
  complete: (at: Date) => ({ completedAt: at }),
  no_show: (at: Date) => ({ noShowAt: at }),
} as const;

export class BookingOperationalLifecycleService {
  static async apply(input: { companyId: string; bookingId: string; action: OperationalAction; actorId?: string | null; reason?: string | null }) {
    const sourceStates = getBookingSourceStates(input.action);
    if (!sourceStates.length) return { ok: false as const, error: "invalid_action" as const };
    const db = getDb();
    const result = await db.transaction(async (tx) => {
      const currentRows = await tx.select({ id: bookings.id, clientId: bookings.clientId, status: bookings.status, startTime: bookings.startTime })
        .from(bookings).where(and(eq(bookings.id, input.bookingId), eq(bookings.companyId, input.companyId))).limit(1);
      const current = currentRows[0];
      if (!current) return { ok: false as const, error: "booking_not_found" as const };
      if (!sourceStates.includes(current.status as any)) return { ok: false as const, error: "invalid_state_transition" as const, currentStatus: current.status };
      if (input.action === "no_show" && new Date(current.startTime).getTime() > Date.now()) return { ok: false as const, error: "booking_not_started_yet" as const };
      const nextStatus = applyBookingAction(current.status as any, input.action);
      if (!nextStatus) return { ok: false as const, error: "invalid_state_transition" as const };
      const occurredAt = new Date();
      const updated = await tx.update(bookings)
        .set({ status: nextStatus, ...timestampByAction[input.action](occurredAt), updatedAt: occurredAt })
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.companyId, input.companyId), inArray(bookings.status as any, sourceStates)))
        .returning({ id: bookings.id, status: bookings.status });
      const row = updated[0];
      if (!row) return { ok: false as const, error: "concurrent_state_change" as const };
      await tx.insert(bookingEvents).values({
        companyId: input.companyId, bookingId: input.bookingId, clientId: current.clientId,
        type: eventByAction[input.action], actor: "admin",
        payload: { action: input.action, previousStatus: current.status, status: nextStatus, occurredAt: new Date().toISOString(), actorId: input.actorId ?? null, reason: input.reason ?? null },
      });
      return { ok: true as const, bookingId: input.bookingId, previousStatus: current.status, status: nextStatus };
    });
    if (result.ok && ["arrive", "start", "complete", "no_show"].includes(input.action)) {
      await BookingReminderPlannerService.cancelSafely({
        companyId: input.companyId,
        bookingId: input.bookingId,
        reason: `Ciclo operacional: ${input.action}`,
      });
    }
    if (result.ok && input.action === "complete") {
      await BookingFollowupPlannerService.planSafely({ companyId: input.companyId, bookingId: input.bookingId });
    }
    return result;
  }
}
