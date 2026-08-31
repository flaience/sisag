import { and, asc, eq, gt, inArray } from "drizzle-orm";
import { bookings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingService } from "./Booking.service";

export type WhatsAppBookingOption = {
  bookingId: string;
  scheduledTimeUtc: string;
};

export class WhatsAppBookingLifecycleService {
  static async listUpcoming(input: {
    companyId: string;
    clientId: string;
    now?: Date;
    limit?: number;
  }): Promise<WhatsAppBookingOption[]> {
    const rows = await getDb()
      .select({ id: bookings.id, startTime: bookings.startTime })
      .from(bookings)
      .where(and(
        eq(bookings.companyId, input.companyId),
        eq(bookings.clientId, input.clientId),
        inArray(bookings.status as any, ["PENDING", "CONFIRMED"]),
        gt(bookings.startTime, input.now ?? new Date()),
      ))
      .orderBy(asc(bookings.startTime))
      .limit(Math.min(Math.max(input.limit ?? 3, 1), 10));

    return rows.map((row) => ({
      bookingId: row.id,
      scheduledTimeUtc: new Date(row.startTime).toISOString(),
    }));
  }

  static async cancel(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
    minAdvanceMinutes: number;
    now?: Date;
  }) {
    const owned = await this.findOwnedActive(input);
    if (!owned) return { ok: false as const, message: "Agendamento não encontrado ou já encerrado." };

    const remaining = new Date(owned.startTime).getTime() - (input.now ?? new Date()).getTime();
    if (remaining < input.minAdvanceMinutes * 60_000) {
      return { ok: false as const, message: "O prazo mínimo para cancelamento já foi atingido. Vou encaminhar para a equipe." };
    }

    const result = await BookingService.cancelById({
      companyId: input.companyId,
      clientId: input.clientId,
      bookingId: input.bookingId,
      actor: "whatsapp",
      reason: "Solicitado pelo cliente via WhatsApp",
    });
    return result.ok
      ? { ok: true as const, replyText: "✅ Agendamento cancelado com sucesso." }
      : { ok: false as const, message: "Não consegui cancelar esse agendamento. Vou encaminhar para a equipe." };
  }

  static async reschedule(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
    newStartTime: string;
  }) {
    const owned = await this.findOwnedActive(input);
    if (!owned) return { ok: false as const, message: "Agendamento não encontrado ou já encerrado." };

    return BookingService.rescheduleById({
      companyId: input.companyId,
      bookingId: input.bookingId,
      newStartTime: input.newStartTime,
      actor: "whatsapp",
      reason: "Solicitado pelo cliente via WhatsApp",
    });
  }

  private static async findOwnedActive(input: { companyId: string; clientId: string; bookingId: string }) {
    const rows = await getDb()
      .select({ id: bookings.id, startTime: bookings.startTime })
      .from(bookings)
      .where(and(
        eq(bookings.id, input.bookingId),
        eq(bookings.companyId, input.companyId),
        eq(bookings.clientId, input.clientId),
        inArray(bookings.status as any, ["PENDING", "CONFIRMED"]),
      ))
      .limit(1);
    return rows[0] ?? null;
  }
}
