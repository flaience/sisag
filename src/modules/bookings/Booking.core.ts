// src/modules/bookings/Booking.core.ts
import { getDb } from "@/lib/db";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
  bookingEvents,
  services,
  serviceRequirements,
  resources,
  professionals,
} from "@/drizzle/schema";
import { and, eq, gt, lt, inArray, sql } from "drizzle-orm";

/* =====================================================
   TYPES
===================================================== */
type CreateAutoInput = {
  companyId: string;
  clientId: string;
  professionalId?: string;
  serviceId: string;
  startTime: string;
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
        | "professional_not_found"
        | "professional_has_no_resource"
        | "professional_not_compatible"
        | "resource_not_found"
        | "slot_taken"
        | "internal_error";
    };

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

/* =====================================================
   BOOKING CORE SERVICE
   Métodos essenciais para a Scheduling Capability.
   Sem dependências pesadas (journey, messaging, etc).
===================================================== */
export class BookingCoreService {
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

      const serviceRows = await db
        .select({ id: services.id, durationMinutes: services.durationMinutes })
        .from(services)
        .where(eq(services.id, input.serviceId))
        .limit(1);

      const service = serviceRows[0];
      if (!service) return { ok: false, error: "service_not_found" };

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

      const resourceIds: string[] = [];
      const satisfiedRequirementIds = new Set<string>();

      if (input.professionalId) {
        const professionalRows = await db
          .select({
            id: professionals.id,
            resourceId: professionals.resourceId,
            resourceName: resources.name,
            resourceTypeId: resources.typeId,
          })
          .from(professionals)
          .leftJoin(resources, eq(resources.id, professionals.resourceId))
          .where(
            and(
              eq(professionals.id, input.professionalId),
              eq(professionals.companyId, input.companyId),
            ),
          )
          .limit(1);

        const professional = professionalRows[0];

        if (!professional) {
          return { ok: false, error: "professional_not_found" };
        }

        if (!professional.resourceId || !professional.resourceTypeId) {
          return { ok: false, error: "professional_has_no_resource" };
        }

        const matchedRequirement = reqs.find(
          (req) => req.resourceTypeId === professional.resourceTypeId,
        );

        if (!matchedRequirement) {
          return { ok: false, error: "professional_not_compatible" };
        }

        resourceIds.push(professional.resourceId);
        satisfiedRequirementIds.add(matchedRequirement.id);
      }

      for (const req of reqs) {
        if (satisfiedRequirementIds.has(req.id)) continue;

        const resourceRows = await db
          .select({ id: resources.id })
          .from(resources)
          .where(eq(resources.typeId, req.resourceTypeId))
          .limit(1);

        const resource = resourceRows[0];
        if (!resource) return { ok: false, error: "resource_not_found" };

        resourceIds.push(resource.id);
      }

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

        await tx.insert(bookingEvents).values({
          companyId: input.companyId,
          bookingId,
          clientId: input.clientId,
          type: "booking.created",
          actor: "system",
          payload: {
            bookingId,
            createdAt: new Date().toISOString(),
            startTime: start,
            serviceId: input.serviceId,
            professionalId: input.professionalId ?? null,
          },
        });

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
      console.error("BookingCoreService.createAuto error:", err);
      return { ok: false, error: "internal_error" };
    }
  }

  static async confirmById(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
  }) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        update bookings
        set status = 'CONFIRMED', updated_at = now()
        where id = ${input.bookingId}::uuid
          and company_id = ${input.companyId}::uuid
          and client_id = ${input.clientId}::uuid
          and status in ('PENDING')
        returning id, start_time as "startTime", status;
      `);

      const r = (rows as any).rows?.[0];
      if (!r) {
        return { ok: false as const, error: "not_found" as const };
      }

      await tx.insert(bookingEvents).values({
        companyId: input.companyId,
        bookingId: input.bookingId,
        clientId: input.clientId,
        type: "booking.confirmed",
        actor: input.actor ?? "admin",
        payload: {
          bookingId: input.bookingId,
          confirmedAt: new Date().toISOString(),
          startTime: r.startTime,
        },
      });

      return { ok: true as const, bookingId: r.id, startTime: r.startTime };
    });
  }

  static async cancelById(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
    reason?: string | null;
  }) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const bookingRows = await tx
        .select({
          id: bookings.id,
          startTime: bookings.startTime,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.companyId, input.companyId),
            eq(bookings.clientId, input.clientId),
            inArray(bookings.status as any, ["PENDING", "CONFIRMED"]),
          ),
        )
        .limit(1);

      const current = bookingRows[0];
      if (!current) {
        return {
          ok: false as const,
          error: "not_found_or_not_cancellable" as const,
        };
      }

      const allocationRows = await tx.execute(sql`
        select
          a.id,
          a.resource_id as "resourceId",
          a.start_time as "startTime",
          a.end_time as "endTime",
          r.name as "resourceName"
        from booking_item_allocations a
        inner join booking_items bi on bi.id = a.booking_item_id
        left join resources r on r.id = a.resource_id
        where bi.booking_id = ${input.bookingId}::uuid
      `);

      const allocationsBefore = (allocationRows as any).rows ?? [];

      await tx.execute(sql`
        update bookings
        set status = 'CANCELLED', updated_at = now()
        where id = ${input.bookingId}::uuid
          and company_id = ${input.companyId}::uuid
          and client_id = ${input.clientId}::uuid
          and status in ('PENDING','CONFIRMED');
      `);

      await tx.execute(sql`
        delete from booking_item_allocations a
        using booking_items bi
        where a.booking_item_id = bi.id
          and bi.booking_id = ${input.bookingId}::uuid;
      `);

      await tx.insert(bookingEvents).values({
        companyId: input.companyId,
        bookingId: input.bookingId,
        clientId: input.clientId,
        type: "booking.cancelled",
        actor: input.actor ?? "admin",
        payload: {
          bookingId: input.bookingId,
          cancelledAt: new Date().toISOString(),
          previousStatus: current.status,
          startTime: current.startTime,
          reason: input.reason ?? null,
          releasedAllocations: allocationsBefore,
        },
      });

      return {
        ok: true as const,
        bookingId: current.id,
        startTime: current.startTime,
      };
    });
  }
}
