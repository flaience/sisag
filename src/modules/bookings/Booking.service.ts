import { getDb } from "@/lib/db";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
  services,
  serviceRequirements,
  resources,
} from "@/drizzle/schema";
import { and, desc, eq, inArray, lt, gt } from "drizzle-orm";

/* =====================================================
   TYPES
===================================================== */

type CreateAutoInput = {
  companyId: string;
  clientId: string;
  serviceId: string;
  startTime: string; // ISO
  notes?: string;
};

type CreateAutoResult =
  | {
      ok: true;
      booking: {
        id: string;
        companyId: string;
        clientId: string;
        startTime: string;
        status: string;
      };
    }
  | {
      ok: false;
      error:
        | "company_id_required"
        | "client_id_required"
        | "service_id_required"
        | "start_time_required"
        | "service_not_found"
        | "invalid_start_time"
        | "service_has_no_requirements"
        | "resource_not_found"
        | "slot_taken"
        | "internal_error";
    };

/* =====================================================
   SERVICE
===================================================== */

export class BookingService {
  /* =====================================================
     CREATE AUTO (core usado pelo ConversationEngine)
  ===================================================== */

  static async createAuto(input: CreateAutoInput): Promise<CreateAutoResult> {
    try {
      if (!input.companyId) return { ok: false, error: "company_id_required" };
      if (!input.clientId) return { ok: false, error: "client_id_required" };
      if (!input.serviceId) return { ok: false, error: "service_id_required" };
      if (!input.startTime) return { ok: false, error: "start_time_required" };

      const start = new Date(input.startTime);
      if (Number.isNaN(start.getTime())) {
        return { ok: false, error: "invalid_start_time" };
      }

      const db = getDb();

      // 1) service
      const serviceRows = await db
        .select({
          id: services.id,
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(eq(services.id, input.serviceId))
        .limit(1);

      const service = serviceRows[0];
      if (!service) return { ok: false, error: "service_not_found" };

      // 2) requirements
      const reqs = await db
        .select({
          id: serviceRequirements.id,
          resourceTypeId: serviceRequirements.resourceTypeId,
          quantity: serviceRequirements.quantity,
        })
        .from(serviceRequirements)
        .where(eq(serviceRequirements.serviceId, input.serviceId));

      if (!reqs.length) {
        return { ok: false, error: "service_has_no_requirements" };
      }

      const durationMs = service.durationMinutes * 60 * 1000;
      const end = new Date(start.getTime() + durationMs);

      // 3) resolve resources (simplificado: 1 por tipo)
      const resourceIds: string[] = [];

      for (const r of reqs) {
        const resourceRows = await db
          .select({
            id: resources.id,
          })
          .from(resources)
          .where(eq(resources.typeId, r.resourceTypeId))
          .limit(1);

        const resource = resourceRows[0];
        if (!resource) return { ok: false, error: "resource_not_found" };

        resourceIds.push(resource.id);
      }

      // 4) conflito (allocation overlap)
      for (const resourceId of resourceIds) {
        const conflicts = await db
          .select({ id: bookingItemAllocations.id })
          .from(bookingItemAllocations)
          .where(
            and(
              eq(bookingItemAllocations.resourceId, resourceId),
              lt(bookingItemAllocations.startTime, end),
              gt(bookingItemAllocations.endTime, start),
            ),
          )
          .limit(1);

        if (conflicts.length > 0) {
          return { ok: false, error: "slot_taken" };
        }
      }

      /* ===========================
         TRANSACTION
      =========================== */

      const result = await db.transaction(async (tx) => {
        const bookingInserted = await tx
          .insert(bookings)
          .values({
            companyId: input.companyId,
            clientId: input.clientId,
            startTime: start,
            status: "PENDING",
            notes: input.notes ?? null,
          })
          .returning({ id: bookings.id });

        const bookingId = bookingInserted[0]!.id;

        const itemInserted = await tx
          .insert(bookingItems)
          .values({
            bookingId,
            serviceId: input.serviceId,
            durationMinutes: service.durationMinutes,
            price: null,
            startTime: start,
            endTime: end,
          })
          .returning({ id: bookingItems.id });

        const bookingItemId = itemInserted[0]!.id;

        for (const resourceId of resourceIds) {
          await tx.insert(bookingItemAllocations).values({
            bookingItemId,
            resourceId,
            startTime: start,
            endTime: end,
          });
        }

        return bookingId;
      });

      return {
        ok: true,
        booking: {
          id: result,
          companyId: input.companyId,
          clientId: input.clientId,
          startTime: start.toISOString(),
          status: "PENDING",
        },
      };
    } catch (err) {
      console.error("BookingService.createAuto error:", err);
      return { ok: false, error: "internal_error" };
    }
  }

  /* =====================================================
     CONFIRM LATEST
  ===================================================== */

  static async confirmLatestPending(input: {
    companyId: string;
    clientId: string;
  }) {
    const db = getDb();

    const rows = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, input.companyId),
          eq(bookings.clientId, input.clientId),
          inArray(bookings.status as any, ["PENDING"]),
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(1);

    const b = rows[0];
    if (!b) return { ok: false as const, error: "no_pending_booking" };

    await db
      .update(bookings)
      .set({ status: "CONFIRMED", updatedAt: new Date() } as any)
      .where(eq(bookings.id, b.id));

    return {
      ok: true as const,
      bookingId: b.id,
      startTime: b.startTime,
    };
  }

  /* =====================================================
     CANCEL LATEST
  ===================================================== */

  static async cancelLatest(input: { companyId: string; clientId: string }) {
    const db = getDb();

    const rows = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.companyId, input.companyId),
          eq(bookings.clientId, input.clientId),
          inArray(bookings.status as any, ["PENDING", "CONFIRMED"]),
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(1);

    const b = rows[0];
    if (!b) return { ok: false as const, error: "no_active_booking" };

    await db
      .update(bookings)
      .set({ status: "CANCELLED", updatedAt: new Date() } as any)
      .where(eq(bookings.id, b.id));

    return {
      ok: true as const,
      bookingId: b.id,
      startTime: b.startTime,
    };
  }
}
