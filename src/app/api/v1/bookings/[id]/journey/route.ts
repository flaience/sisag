// src/app/api/v1/bookings/[id]/journey/route.ts
import { NextResponse } from "next/server";
import { BookingService } from "@/modules/bookings/Booking.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_id_required",
          message: "Booking é obrigatório.",
        },
        { status: 400 },
      );
    }

    const journey = await BookingService.getJourney(id);

    if (!journey) {
      return NextResponse.json(
        {
          ok: false,
          error: "booking_not_found",
          message: "Booking não encontrado.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      booking: {
        id: journey.booking.id,
        companyId: journey.booking.companyId,
        clientId: journey.booking.clientId,
        startTime: toIso(journey.booking.startTime),
        status: journey.booking.status,
        notes: journey.booking.notes,
        createdAt: toIso(journey.booking.createdAt),
        updatedAt: toIso(journey.booking.updatedAt),
      },
      client: {
        id: journey.client.id,
        name: journey.client.name,
        phone: journey.client.phone,
        email: journey.client.email,
      },
      rescheduleTarget: journey.rescheduleTarget
        ? {
            professionalId: journey.rescheduleTarget.professionalId,
            professionalName: journey.rescheduleTarget.professionalName,
            resourceId: journey.rescheduleTarget.resourceId,
          }
        : null,
      items: journey.items.map((item) => ({
        id: item.id,
        bookingId: item.bookingId,
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        durationMinutes: item.durationMinutes,
        price: item.price,
        startTime: toIso(item.startTime),
        endTime: toIso(item.endTime),
        createdAt: toIso(item.createdAt),
      })),
      allocations: journey.allocations.map((allocation) => ({
        id: allocation.id,
        bookingItemId: allocation.bookingItemId,
        resourceId: allocation.resourceId,
        resourceName: allocation.resourceName,
        startTime: toIso(allocation.startTime),
        endTime: toIso(allocation.endTime),
        createdAt: toIso(allocation.createdAt),
      })),
      events: journey.events.map((event) => ({
        id: event.id,
        type: event.type,
        actor: event.actor,
        payload: event.payload,
        createdAt: toIso(event.createdAt),
        outboxId: event.outboxId,
        sessionId: event.sessionId,
      })),
      automationJobs: journey.automationJobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        runAt: toIso(job.runAt),
        attempts: job.attempts,
        lastError: job.lastError,
        createdAt: toIso(job.createdAt),
        updatedAt: toIso(job.updatedAt),
      })),
      conversationSessions: journey.conversationSessions.map((session) => ({
        id: session.id,
        status: session.status,
        context: session.context,
        createdAt: toIso(session.createdAt),
        updatedAt: toIso(session.updatedAt),
      })),
      messageLogs: journey.messageLogs.map((message) => ({
        id: message.id,
        channel: message.channel,
        provider: message.provider,
        toPhone: message.toPhone,
        messageType: message.messageType,
        body: message.body,
        status: message.status,
        providerMessageId: message.providerMessageId,
        error: message.error,
        sentAt: toIso(message.sentAt),
        deliveredAt: toIso(message.deliveredAt),
        readAt: toIso(message.readAt),
        failedAt: toIso(message.failedAt),
        createdAt: toIso(message.createdAt),
      })),
      lastMessage: journey.lastMessage
        ? {
            id: journey.lastMessage.id,
            channel: journey.lastMessage.channel,
            provider: journey.lastMessage.provider,
            toPhone: journey.lastMessage.toPhone,
            messageType: journey.lastMessage.messageType,
            body: journey.lastMessage.body,
            status: journey.lastMessage.status,
            providerMessageId: journey.lastMessage.providerMessageId,
            error: journey.lastMessage.error,
            sentAt: toIso(journey.lastMessage.sentAt),
            deliveredAt: toIso(journey.lastMessage.deliveredAt),
            readAt: toIso(journey.lastMessage.readAt),
            failedAt: toIso(journey.lastMessage.failedAt),
            createdAt: toIso(journey.lastMessage.createdAt),
          }
        : null,
      nextAutomationJob: journey.nextAutomationJob
        ? {
            id: journey.nextAutomationJob.id,
            type: journey.nextAutomationJob.type,
            status: journey.nextAutomationJob.status,
            runAt: toIso(journey.nextAutomationJob.runAt),
            attempts: journey.nextAutomationJob.attempts,
            lastError: journey.nextAutomationJob.lastError,
            createdAt: toIso(journey.nextAutomationJob.createdAt),
            updatedAt: toIso(journey.nextAutomationJob.updatedAt),
          }
        : null,
      experienceSummary: journey.experienceSummary,
      suggestedPreMessage: journey.suggestedPreMessage ?? null,
      suggestedPostMessage: journey.suggestedPostMessage ?? null,
    });
  } catch (err: any) {
    console.error("GET /api/v1/bookings/[id]/journey error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Erro interno ao carregar jornada.",
      },
      { status: 500 },
    );
  }
}
