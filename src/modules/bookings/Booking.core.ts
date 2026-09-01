// src/modules/bookings/Booking.core.ts
import { getDb } from "@/lib/db";
import { resolveBookingUnit } from "./BookingUnit.resolver";
import { resolveServiceBookingProfessional } from "@/modules/scheduling-config/ServiceBookingAssignment.engine";
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
import { BOOKING_CAPACITY_STATUSES } from "./Booking.state-contract";

/* =====================================================
   TYPES
===================================================== */
type CreateAutoInput = {
  companyId: string;
  clientId: string;
  professionalId?: string;
  unitId?: string;
  serviceId: string;
  startTime: string;
  notes?: string;
  source?: "panel" | "whatsapp" | "agent" | "api";
  requestedBy?: string | null;
  requestId?: string | null;
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
        | "unit_not_available"
        | "slot_taken"
        | "internal_error";
    };

type RescheduleByIdInput = {
  bookingId: string;
  companyId: string;
  newStartTime: string;
  actor?: "admin" | "system" | "whatsapp" | "n8n";
  reason?: string | null;
};

type RescheduleByIdResult =
  | {
      ok: true;
      bookingId: string;
      companyId: string;
      clientId: string;
      serviceId: string;
      resourceIds: string[];
      oldStartTime: string;
      newStartTime: string;
      newEndTime: string;
      status: string;
    }
  | {
      ok: false;
      error:
        | "company_id_required"
        | "booking_id_required"
        | "new_start_time_required"
        | "invalid_start_time"
        | "same_start_time"
        | "booking_not_found"
        | "booking_not_reschedulable"
        | "booking_has_no_items"
        | "booking_has_multiple_items"
        | "service_not_found"
        | "service_has_no_requirements"
        | "resource_not_found"
        | "slot_taken"
        | "internal_error";
      message?: string;
    };

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  const visited = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

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
      const professionalId = input.professionalId ?? (input.unitId ? await resolveServiceBookingProfessional({ companyId: input.companyId, unitId: input.unitId, serviceId: input.serviceId, startsAt: start }) ?? undefined : undefined);

      const serviceRows = await db
        .select({ id: services.id, durationMinutes: services.durationMinutes })
        .from(services)
        .where(
          and(
            eq(services.id, input.serviceId),
            eq(services.companyId, input.companyId),
          ),
        )
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

      if (professionalId) {
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
              eq(professionals.id, professionalId),
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
          .where(
            and(
              eq(resources.typeId, req.resourceTypeId),
              eq(resources.companyId, input.companyId),
              eq(resources.status, "active"),
            ),
          )
          .limit(1);

        const resource = resourceRows[0];
        if (!resource) return { ok: false, error: "resource_not_found" };

        resourceIds.push(resource.id);
      }

      const lockedResourceIds = [...new Set(resourceIds)].sort();

      for (const resourceId of lockedResourceIds) {
        const conflicts = await db
          .select({ id: bookingItemAllocations.id })
          .from(bookingItemAllocations)
          .innerJoin(
            bookingItems,
            eq(bookingItems.id, bookingItemAllocations.bookingItemId),
          )
          .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
          .where(
            and(
              eq(bookingItemAllocations.resourceId, resourceId),
              eq(bookings.companyId, input.companyId),
              inArray(bookings.status, BOOKING_CAPACITY_STATUSES as any),
              lt(bookingItemAllocations.startTime, end),
              gt(bookingItemAllocations.endTime, start),
            ),
          )
          .limit(1);

        if (conflicts.length > 0) {
          return { ok: false, error: "slot_taken" };
        }
      }

      const unitId = await resolveBookingUnit({
        companyId: input.companyId,
        professionalId,
        unitId: input.unitId,
      });
      if (!unitId) return { ok: false, error: "unit_not_available" };

      const result = await db.transaction(async (tx) => {
        for (const resourceId of lockedResourceIds) {
          await tx.execute(sql`
            select pg_advisory_xact_lock(
              hashtextextended(${resourceId}::text, 0)
            )
          `);
        }

        for (const resourceId of lockedResourceIds) {
          const conflicts = await tx
            .select({ id: bookingItemAllocations.id })
            .from(bookingItemAllocations)
            .innerJoin(
              bookingItems,
              eq(bookingItems.id, bookingItemAllocations.bookingItemId),
            )
            .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
            .where(
              and(
                eq(bookingItemAllocations.resourceId, resourceId),
                eq(bookings.companyId, input.companyId),
                inArray(bookings.status, BOOKING_CAPACITY_STATUSES as any),
                lt(bookingItemAllocations.startTime, end),
                gt(bookingItemAllocations.endTime, start),
              ),
            )
            .limit(1);

          if (conflicts.length > 0) {
            return { ok: false as const, error: "slot_taken" as const };
          }
        }

        const bookingInserted = await tx
          .insert(bookings)
          .values({
            companyId: input.companyId,
            clientId: input.clientId,
            unitId,
            startTime: start,
            status: "PENDING",
            notes: input.notes ?? null,
            source: input.source ?? "api",
            requestedBy: input.requestedBy ?? null,
            requestId: input.requestId ?? null,
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

        for (const resourceId of lockedResourceIds) {
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
            professionalId: professionalId ?? null,
          },
        });

        return { ok: true as const, bookingId };
      });

      if (result.ok === false) {
        return result;
      }

      return {
        ok: true,
        booking: {
          id: result.bookingId,
          companyId: input.companyId,
          clientId: input.clientId,
          startTime: start.toISOString(),
          status: "PENDING",
        },
      };
    } catch (err) {
      if (hasPostgresErrorCode(err, "23P01")) {
        return { ok: false, error: "slot_taken" };
      }
      console.error("BookingCoreService.createAuto error:", err);
      return { ok: false, error: "internal_error" };
    }
  }

  static async rescheduleById(
    input: RescheduleByIdInput,
  ): Promise<RescheduleByIdResult> {
    try {
      if (!input.companyId) {
        return { ok: false, error: "company_id_required" };
      }
      if (!input.bookingId) {
        return { ok: false, error: "booking_id_required" };
      }
      if (!input.newStartTime) {
        return { ok: false, error: "new_start_time_required" };
      }

      const newStart = new Date(input.newStartTime);
      if (Number.isNaN(newStart.getTime())) {
        return { ok: false, error: "invalid_start_time" };
      }

      const db = getDb();
      const bookingRows = await db
        .select({
          id: bookings.id,
          companyId: bookings.companyId,
          clientId: bookings.clientId,
          startTime: bookings.startTime,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.companyId, input.companyId),
          ),
        )
        .limit(1);

      const booking = bookingRows[0];
      if (!booking) return { ok: false, error: "booking_not_found" };

      const status = booking.status?.toUpperCase?.() ?? "";
      if (!["PENDING", "CONFIRMED"].includes(status)) {
        return { ok: false, error: "booking_not_reschedulable" };
      }
      if (new Date(booking.startTime).getTime() === newStart.getTime()) {
        return { ok: false, error: "same_start_time" };
      }

      const items = await db
        .select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          durationMinutes: bookingItems.durationMinutes,
          startTime: bookingItems.startTime,
          endTime: bookingItems.endTime,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, input.bookingId));

      if (!items.length) return { ok: false, error: "booking_has_no_items" };
      if (items.length !== 1) {
        return { ok: false, error: "booking_has_multiple_items" };
      }

      const item = items[0];
      const serviceRows = await db
        .select({ id: services.id })
        .from(services)
        .where(
          and(
            eq(services.id, item.serviceId),
            eq(services.companyId, input.companyId),
          ),
        )
        .limit(1);

      if (!serviceRows[0]) return { ok: false, error: "service_not_found" };

      const requirements = await db
        .select({
          id: serviceRequirements.id,
          resourceTypeId: serviceRequirements.resourceTypeId,
          quantity: serviceRequirements.quantity,
        })
        .from(serviceRequirements)
        .where(eq(serviceRequirements.serviceId, item.serviceId));

      if (!requirements.length) {
        return { ok: false, error: "service_has_no_requirements" };
      }

      const newEnd = addMinutes(newStart, item.durationMinutes);
      const oldAllocations = await db
        .select({
          id: bookingItemAllocations.id,
          resourceId: bookingItemAllocations.resourceId,
          startTime: bookingItemAllocations.startTime,
          endTime: bookingItemAllocations.endTime,
          resourceName: resources.name,
        })
        .from(bookingItemAllocations)
        .leftJoin(resources, eq(resources.id, bookingItemAllocations.resourceId))
        .where(eq(bookingItemAllocations.bookingItemId, item.id));

      const oldResourceIds = new Set(
        oldAllocations.map((allocation) => allocation.resourceId),
      );
      const selectedResourceIds = new Set<string>();

      for (const requirement of requirements) {
        const candidates = await db
          .select({ id: resources.id })
          .from(resources)
          .where(
            and(
              eq(resources.companyId, input.companyId),
              eq(resources.typeId, requirement.resourceTypeId),
              eq(resources.status, "active"),
            ),
          );

        if (!candidates.length) {
          return { ok: false, error: "resource_not_found" };
        }

        const orderedCandidates = [...candidates].sort(
          (left, right) =>
            Number(oldResourceIds.has(right.id)) -
            Number(oldResourceIds.has(left.id)),
        );
        let selectedForRequirement = 0;
        const requiredQuantity = Math.max(1, requirement.quantity);

        for (const candidate of orderedCandidates) {
          if (selectedResourceIds.has(candidate.id)) continue;

          const conflicts = await db
            .select({ id: bookingItemAllocations.id })
            .from(bookingItemAllocations)
            .leftJoin(
              bookingItems,
              eq(bookingItems.id, bookingItemAllocations.bookingItemId),
            )
            .leftJoin(bookings, eq(bookings.id, bookingItems.bookingId))
            .where(
              and(
                eq(bookingItemAllocations.resourceId, candidate.id),
                eq(bookings.companyId, input.companyId),
                inArray(bookings.status, BOOKING_CAPACITY_STATUSES as any),
                lt(bookingItemAllocations.startTime, newEnd),
                gt(bookingItemAllocations.endTime, newStart),
                sql`${bookingItems.bookingId} <> ${input.bookingId}::uuid`,
              ),
            )
            .limit(1);

          if (conflicts.length === 0) {
            selectedResourceIds.add(candidate.id);
            selectedForRequirement += 1;
          }
          if (selectedForRequirement === requiredQuantity) break;
        }

        if (selectedForRequirement !== requiredQuantity) {
          return { ok: false, error: "slot_taken" };
        }
      }

      const resourceIds = [...selectedResourceIds].sort();
      return await db.transaction(async (tx) => {
        const lockedBookingResult = await tx.execute(sql`
          select id, status
          from bookings
          where id = ${input.bookingId}::uuid
            and company_id = ${input.companyId}::uuid
          for update
        `);
        type LockedBooking = { id: string; status: string };
        const normalizedLockedResult = lockedBookingResult as unknown as
          | { rows?: LockedBooking[] }
          | LockedBooking[];
        const lockedBookingRows = Array.isArray(normalizedLockedResult)
          ? normalizedLockedResult
          : (normalizedLockedResult.rows ?? []);
        const lockedBooking = lockedBookingRows[0];

        if (!lockedBooking) {
          return { ok: false as const, error: "booking_not_found" as const };
        }
        if (!["PENDING", "CONFIRMED"].includes(lockedBooking.status)) {
          return {
            ok: false as const,
            error: "booking_not_reschedulable" as const,
          };
        }

        for (const resourceId of resourceIds) {
          await tx.execute(sql`
            select pg_advisory_xact_lock(
              hashtextextended(${resourceId}::text, 0)
            )
          `);
        }

        for (const resourceId of resourceIds) {
          const conflicts = await tx
            .select({ id: bookingItemAllocations.id })
            .from(bookingItemAllocations)
            .leftJoin(
              bookingItems,
              eq(bookingItems.id, bookingItemAllocations.bookingItemId),
            )
            .leftJoin(bookings, eq(bookings.id, bookingItems.bookingId))
            .where(
              and(
                eq(bookingItemAllocations.resourceId, resourceId),
                eq(bookings.companyId, input.companyId),
                inArray(bookings.status, BOOKING_CAPACITY_STATUSES as any),
                lt(bookingItemAllocations.startTime, newEnd),
                gt(bookingItemAllocations.endTime, newStart),
                sql`${bookingItems.bookingId} <> ${input.bookingId}::uuid`,
              ),
            )
            .limit(1);

          if (conflicts.length > 0) {
            return { ok: false as const, error: "slot_taken" as const };
          }
        }

        await tx
          .update(bookings)
          .set({ startTime: newStart, updatedAt: new Date() })
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.companyId, input.companyId),
            ),
          );
        await tx
          .update(bookingItems)
          .set({ startTime: newStart, endTime: newEnd })
          .where(eq(bookingItems.id, item.id));
        await tx.execute(sql`
          delete from booking_item_allocations
          where booking_item_id = ${item.id}::uuid
        `);

        for (const resourceId of resourceIds) {
          await tx.insert(bookingItemAllocations).values({
            bookingItemId: item.id,
            resourceId,
            startTime: newStart,
            endTime: newEnd,
          });
        }

        await tx.insert(bookingEvents).values({
          companyId: input.companyId,
          bookingId: input.bookingId,
          clientId: booking.clientId,
          type: "booking.rescheduled",
          actor: input.actor ?? "system",
          payload: {
            reason: input.reason ?? null,
            before: {
              startTime: new Date(item.startTime).toISOString(),
              endTime: new Date(item.endTime).toISOString(),
              status,
              allocations: oldAllocations,
            },
            after: {
              startTime: newStart.toISOString(),
              endTime: newEnd.toISOString(),
              status,
              resourceIds,
            },
          },
        });

        return {
          ok: true as const,
          bookingId: input.bookingId,
          companyId: input.companyId,
          clientId: booking.clientId,
          serviceId: item.serviceId,
          resourceIds,
          oldStartTime: new Date(item.startTime).toISOString(),
          newStartTime: newStart.toISOString(),
          newEndTime: newEnd.toISOString(),
          status,
        };
      });
    } catch (error) {
      console.error("BookingCoreService.rescheduleById error:", error);
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

  static async completeById(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
    notes?: string | null;
  }) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const updateResult = await tx.execute(sql`
        update bookings
        set status = 'COMPLETED', updated_at = now()
        where id = ${input.bookingId}::uuid
          and company_id = ${input.companyId}::uuid
          and client_id = ${input.clientId}::uuid
          and status = 'CONFIRMED'
          and start_time <= now()
        returning id, start_time as "startTime", status;
      `);

      type CompletedBookingRow = {
        id: string;
        startTime: Date | string;
        status: string;
      };
      const normalizedResult = updateResult as unknown as
        | { rows?: CompletedBookingRow[] }
        | CompletedBookingRow[];
      const rows = Array.isArray(normalizedResult)
        ? normalizedResult
        : (normalizedResult.rows ?? []);
      const completed = rows[0];

      if (!completed) {
        return {
          ok: false as const,
          error: "not_found_or_not_completable" as const,
        };
      }

      const completedAt = new Date().toISOString();
      await tx.insert(bookingEvents).values({
        companyId: input.companyId,
        bookingId: input.bookingId,
        clientId: input.clientId,
        type: "booking.completed",
        actor: input.actor ?? "admin",
        payload: {
          bookingId: input.bookingId,
          completedAt,
          previousStatus: "CONFIRMED",
          startTime: completed.startTime,
          notes: input.notes ?? null,
        },
      });

      return {
        ok: true as const,
        bookingId: completed.id,
        startTime: completed.startTime,
        completedAt,
      };
    });
  }
}
