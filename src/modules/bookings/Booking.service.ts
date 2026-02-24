// src/modules/bookings/Booking.service.ts
import { getDb } from "@/lib/db";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
} from "@/drizzle/schema";

/**
 * Postgres error code helper (DrizzleQueryError usually wraps the PG error in `cause`)
 */
function pgCode(err: any): string | undefined {
  return err?.code ?? err?.cause?.code;
}

function isExclusionViolation(err: any) {
  // Postgres: exclusion_violation (EXCLUDE constraint)
  return pgCode(err) === "23P01";
}

function isUniqueViolation(err: any) {
  // Postgres: unique_violation (UNIQUE index/constraint)
  return pgCode(err) === "23505";
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

    // ----------------------------
    // Basic validation
    // ----------------------------
    if (!input?.companyId) {
      return { ok: false as const, error: "company_id_required" as const };
    }
    if (!input?.clientId) {
      return { ok: false as const, error: "client_id_required" as const };
    }
    if (!input?.items?.length) {
      return { ok: false as const, error: "items_required" as const };
    }

    // Validate items early to fail fast before opening a transaction
    for (const [i, item] of input.items.entries()) {
      if (!item?.serviceId) {
        return {
          ok: false as const,
          error: "service_id_required" as const,
          message: `Missing serviceId at items[${i}]`,
        };
      }
      if (!item?.durationMinutes || item.durationMinutes <= 0) {
        return {
          ok: false as const,
          error: "duration_required" as const,
          message: `Invalid durationMinutes at items[${i}]`,
        };
      }
      if (!item?.startTime || !item?.endTime) {
        return {
          ok: false as const,
          error: "item_time_required" as const,
          message: `Missing startTime/endTime at items[${i}]`,
        };
      }
      if (!item?.resourceIds?.length) {
        return {
          ok: false as const,
          error: "resource_ids_required" as const,
          message: `Missing resourceIds at items[${i}]`,
        };
      }

      const start = new Date(item.startTime);
      const end = new Date(item.endTime);

      if (Number.isNaN(start.getTime())) {
        return {
          ok: false as const,
          error: "invalid_start_time" as const,
          message: `Invalid startTime at items[${i}]`,
        };
      }
      if (Number.isNaN(end.getTime())) {
        return {
          ok: false as const,
          error: "invalid_end_time" as const,
          message: `Invalid endTime at items[${i}]`,
        };
      }
      if (start >= end) {
        return {
          ok: false as const,
          error: "invalid_time_range" as const,
          message: `startTime must be < endTime at items[${i}]`,
        };
      }
    }

    // ----------------------------
    // Transaction: all-or-nothing
    // ----------------------------
    try {
      const bookingRow = await db.transaction(async (tx) => {
        const firstStart = new Date(input.items[0]!.startTime);

        const [booking] = await tx
          .insert(bookings)
          .values({
            companyId: input.companyId,
            clientId: input.clientId,
            startTime: firstStart,
            status: input.status ?? "PENDING",
            notes: input.notes ?? null,
          })
          .returning();

        // Create items + allocations
        for (const item of input.items) {
          const start = new Date(item.startTime);
          const end = new Date(item.endTime);

          const [bi] = await tx
            .insert(bookingItems)
            .values({
              bookingId: booking.id,
              serviceId: item.serviceId,
              durationMinutes: item.durationMinutes,
              price: item.price ?? null,
              startTime: start,
              endTime: end,
            })
            .returning();

          // IMPORTANT: copy start/end to allocations (enables EXCLUDE overlap protection)
          for (const resourceId of item.resourceIds) {
            await tx.insert(bookingItemAllocations).values({
              bookingItemId: bi.id,
              resourceId,
              startTime: start,
              endTime: end,
            });
          }
        }

        return booking;
      });

      return { ok: true as const, booking: bookingRow };
    } catch (err: any) {
      if (isExclusionViolation(err)) {
        return {
          ok: false as const,
          error: "slot_taken" as const,
          message: "Um recurso já está ocupado no intervalo selecionado.",
        };
      }

      if (isUniqueViolation(err)) {
        return {
          ok: false as const,
          error: "unique_violation" as const,
          message: "Conflito de unicidade (registro duplicado).",
        };
      }

      console.error("BookingService.create error:", {
        code: err?.code,
        causeCode: err?.cause?.code,
        constraint: err?.cause?.constraint,
        detail: err?.cause?.detail,
        message: err?.message,
      });

      return {
        ok: false as const,
        error: "internal_error" as const,
        message: err?.message ?? "Internal error",
      };
    }
  },
};
