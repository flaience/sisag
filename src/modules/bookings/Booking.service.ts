import { getDb } from "@/lib/db";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
} from "@/drizzle/schema";

function isExclusionViolation(err: any) {
  // Postgres EXCLUDE constraint violation
  return err?.code === "23P01";
}

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type CreateBookingInput = {
  companyId: string;
  clientId: string;
  notes?: string | null;
  status?: BookingStatus;

  items: Array<{
    serviceId: string;
    durationMinutes: number;
    price?: string | null;

    startTime: string; // ISO string
    endTime: string; // ISO string

    resourceIds: string[];
  }>;
};

export const BookingService = {
  async create(input: CreateBookingInput) {
    const db = getDb();

    // validação mínima (mantém o style “ok:false”)
    if (!input?.companyId) {
      return { ok: false as const, error: "company_id_required" as const };
    }
    if (!input?.clientId) {
      return { ok: false as const, error: "client_id_required" as const };
    }
    if (!input?.items?.length) {
      return { ok: false as const, error: "items_required" as const };
    }

    try {
      const booking = await db.transaction(async (tx) => {
        const firstStart = new Date(input.items[0]!.startTime);

        const [b] = await tx
          .insert(bookings)
          .values({
            companyId: input.companyId,
            clientId: input.clientId,
            startTime: firstStart,
            status: input.status ?? "PENDING",
            notes: input.notes ?? null,
          })
          .returning();

        for (const item of input.items) {
          if (!item.serviceId) {
            return {
              ok: false as const,
              error: "service_id_required" as const,
            };
          }
          if (!item.durationMinutes) {
            return { ok: false as const, error: "duration_required" as const };
          }
          if (!item.startTime || !item.endTime) {
            return { ok: false as const, error: "item_time_required" as const };
          }
          if (!item.resourceIds?.length) {
            return {
              ok: false as const,
              error: "resource_ids_required" as const,
            };
          }

          const start = new Date(item.startTime);
          const end = new Date(item.endTime);

          if (!(start instanceof Date) || isNaN(start.getTime())) {
            return { ok: false as const, error: "invalid_start_time" as const };
          }
          if (!(end instanceof Date) || isNaN(end.getTime())) {
            return { ok: false as const, error: "invalid_end_time" as const };
          }
          if (start >= end) {
            return { ok: false as const, error: "invalid_time_range" as const };
          }

          const [bi] = await tx
            .insert(bookingItems)
            .values({
              bookingId: b!.id,
              serviceId: item.serviceId,
              durationMinutes: item.durationMinutes,
              price: item.price ?? null,
              startTime: start,
              endTime: end,
            })
            .returning();

          // allocations: COPIA start/end do item (modelo correto pro EXCLUDE)
          for (const resourceId of item.resourceIds) {
            await tx.insert(bookingItemAllocations).values({
              bookingItemId: bi!.id,
              resourceId,
              startTime: start,
              endTime: end,
            });
          }
        }

        return b!;
      });

      // se dentro da transaction a gente retornou um erro “ok:false”, booking vai ser esse objeto
      // mas no nosso código acima, a transaction sempre retorna o booking b.
      // então aqui é sucesso:
      return { ok: true as const, booking };
    } catch (err: any) {
      if (isExclusionViolation(err)) {
        return {
          ok: false as const,
          error: "slot_taken" as const,
          message: "Um recurso já está ocupado no intervalo selecionado.",
        };
      }

      console.error("BookingService.create error:", err);
      return {
        ok: false as const,
        error: "internal_error" as const,
        message: err?.message ?? "Internal error",
      };
    }
  },
};
