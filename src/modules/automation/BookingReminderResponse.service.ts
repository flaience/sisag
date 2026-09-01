import { and, desc, eq, gt, gte, inArray } from "drizzle-orm";
import { automationJobs, bookingEvents, bookings, schedulingConfig } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingService } from "@/modules/bookings/Booking.service";
import { WhatsAppBookingLifecycleService } from "@/modules/bookings/WhatsAppBookingLifecycle.service";

export type BookingReminderDecision = "confirm" | "cancel" | "unknown";
export function readBookingReminderDecision(text: string): BookingReminderDecision {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[.!?]+$/g, "");
  if (["sim", "s", "confirmo", "confirmar", "ok"].includes(value)) return "confirm";
  if (["cancelar", "cancela", "desmarcar"].includes(value)) return "cancel";
  return "unknown";
}

export class BookingReminderResponseService {
  static async handle(input: { companyId: string; clientId: string; text: string; correlationId?: string | null; now?: Date }) {
    const decision = readBookingReminderDecision(input.text); if (decision === "unknown") return { handled: false as const };
    const db = getDb(); const now = input.now ?? new Date(); const recent = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
    const rows = await db.select({ jobId: automationJobs.id, outboxId: automationJobs.outboxId, bookingId: bookings.id, status: bookings.status, startTime: bookings.startTime })
      .from(automationJobs).innerJoin(bookings, eq(bookings.id, automationJobs.bookingId))
      .where(and(eq(automationJobs.companyId, input.companyId), eq(automationJobs.clientId, input.clientId), eq(automationJobs.type, "booking_reminder"), eq(automationJobs.status, "done"), gte(automationJobs.completedAt, recent), gt(bookings.startTime, now), inArray(bookings.status as any, ["PENDING", "CONFIRMED", "CANCELLED"])))
      .orderBy(desc(automationJobs.completedAt)).limit(1);
    const target = rows[0]; if (!target) return { handled: false as const };
    if (decision === "confirm" && target.status === "CONFIRMED") return { handled: true as const, applied: false as const, bookingId: target.bookingId, replyText: "✅ Este agendamento já está confirmado." };
    if (decision === "cancel" && target.status === "CANCELLED") return { handled: true as const, applied: false as const, bookingId: target.bookingId, replyText: "✅ Este agendamento já está cancelado." };
    if (target.status === "CANCELLED") return { handled: true as const, applied: false as const, bookingId: target.bookingId, replyText: "Este agendamento já foi cancelado. Se quiser, posso ajudar com um novo horário." };
    let ok = false; let replyText = "Não consegui atualizar o agendamento agora. Vou encaminhar para a equipe.";
    if (decision === "confirm") { const result = await BookingService.confirmById({ companyId: input.companyId, clientId: input.clientId, bookingId: target.bookingId, actor: "whatsapp" }); ok = result.ok; replyText = ok ? "✅ Agendamento confirmado com sucesso." : replyText; }
    else { const config = await db.select({ minutes: schedulingConfig.minCancelAdvanceMinutes }).from(schedulingConfig).where(eq(schedulingConfig.companyId, input.companyId)).limit(1); const result = await WhatsAppBookingLifecycleService.cancel({ companyId: input.companyId, clientId: input.clientId, bookingId: target.bookingId, minAdvanceMinutes: config[0]?.minutes ?? 0, now }); ok = result.ok; replyText = result.ok ? result.replyText : result.message; }
    if (ok) await db.insert(bookingEvents).values({ companyId: input.companyId, bookingId: target.bookingId, clientId: input.clientId, outboxId: target.outboxId, type: "automation.booking_reminder.responded", actor: "whatsapp", payload: { decision, source: "booking_reminder", reminderJobId: target.jobId, correlationId: input.correlationId ?? null, respondedAt: now.toISOString() } });
    return { handled: true as const, applied: ok, bookingId: target.bookingId, replyText };
  }
}
