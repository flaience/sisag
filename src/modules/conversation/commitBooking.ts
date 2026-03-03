// src/modules/conversation/commitBooking.ts
import { getDb } from "@/lib/db";
import { professionals } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { DEFAULT_TIMEZONE } from "@/lib/time";

// ✅ AJUSTE: confirme o path real do seu BookingService
import { BookingService } from "@/modules/bookings/Booking.service";

export type CommitBookingParams = {
  companyId: string;
  clientId: string;

  // de onde vem no ConversationEngine
  serviceId: string;

  // dependendo do seu fluxo, você pode ter professionalId
  professionalId: string;

  // horário final escolhido (UTC)
  startTimeUtcIso: string; // ex: "2026-02-28T13:00:00.000Z"
};

export type CommitBookingResult =
  | {
      ok: true;
      bookingId: string;
    }
  | {
      ok: false;
      error:
        | "professional_resource_not_mapped"
        | "create_auto_failed"
        | "confirm_failed";
      details?: any;
    };

/**
 * Cria + confirma booking a partir do slot escolhido na conversa.
 * - resolve professionals.resource_id (resource do tipo "professional")
 * - chama BookingService.createAuto()
 * - confirma via BookingService.confirmById()
 */
export async function commitBooking(
  p: CommitBookingParams,
): Promise<CommitBookingResult> {
  const db = getDb();

  // 1) resolve resourceId do professional (sem depender do schema tipado)
  const row = (
    await db
      .select({
        resourceId: sql<string | null>`professionals.resource_id`,
      })
      .from(professionals)
      .where(eq(professionals.id, p.professionalId))
      .limit(1)
  )[0];

  const resourceId = row?.resourceId ?? null;

  if (!resourceId) {
    return { ok: false, error: "professional_resource_not_mapped" };
  }

  // 2) cria booking (core)
  // ✅ AJUSTE: mapeie para o CreateAutoInput REAL do seu BookingService.createAuto
  // Vou te dar duas formas (use UMA):

  const created = await BookingService.createAuto({
    companyId: p.companyId,
    clientId: p.clientId,
    serviceId: p.serviceId,

    // OPÇÃO A (se seu CreateAutoInput usa ISO UTC)
    startTimeUtcIso: p.startTimeUtcIso,

    // OPÇÃO B (se seu CreateAutoInput usa Date)
    // startTime: new Date(p.startTimeUtcIso),

    // se o createAuto precisa do resource/professional explicitamente:
    professionalId: p.professionalId,
    resourceId,

    timeZone: DEFAULT_TIMEZONE,
  } as any);

  if (!created?.ok) {
    return { ok: false, error: "create_auto_failed", details: created };
  }

  // 3) extrai bookingId do retorno
  const bookingId = created.booking.id;

  if (!bookingId) {
    return {
      ok: false,
      error: "create_auto_failed",
      details: { created, reason: "missing_booking_id" },
    };
  }

  // 4) confirma (se createAuto já confirmar, ainda é seguro chamar confirmById)
  const confirmed = await BookingService.confirmById({
    companyId: p.companyId,
    clientId: p.clientId,
    bookingId,
  });

  // confirmById no seu service provavelmente retorna algo como { ok, ... } ou booking
  if ((confirmed as any)?.ok === false) {
    return { ok: false, error: "confirm_failed", details: confirmed };
  }

  return { ok: true, bookingId };
}
