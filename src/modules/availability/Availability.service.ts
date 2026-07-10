//src/modules/availability/Availability.service.ts
import {
  DEFAULT_TIMEZONE,
  getMinutesInTz,
  getWeekdayInTz,
  isoUtcToDateIsoInTz,
} from "@/lib/time";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookingItemAllocations,
  resourceSchedules,
  serviceRequirements,
  bookingItems,
  bookings,
  resources,
  services,
} from "@/drizzle/schema";

type ListSlotsInput = {
  companyId: string;
  serviceId?: string;
  startTime: Date;
  resourceId?: string;
  limit?: number;
  stepMinutes?: number;
  durationMinutes?: number;
};

type Slot = {
  startTime: string;
  endTime: string;
  resourceIds: string[];
};

type ListSlotsOk = { ok: true; slots: Slot[] };
type ListSlotsErr = {
  ok: false;
  error:
    | "company_id_required"
    | "invalid_start_time"
    | "service_or_duration_required"
    | "service_has_no_requirements"
    | "resource_not_found"
    | "no_capacity"
    | "internal_error";
  message?: string;
};

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export class AvailabilityService {
  static async listSlots(
    input: ListSlotsInput,
  ): Promise<ListSlotsOk | ListSlotsErr> {
    try {
      if (!input.companyId) {
        return { ok: false, error: "company_id_required" };
      }

      const startTime = input.startTime;
      if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
        return { ok: false, error: "invalid_start_time" };
      }

      const limit = input.limit ?? 6;
      const stepMinutes = input.stepMinutes ?? 15;

      const db = getDb();

      let durationMinutes = Number(input.durationMinutes ?? 0);
      let requiredResourceIds: string[] = [];
      let requiredTypeIds: string[] = [];

      // ==========================================
      // MODO 1: fluxo por serviço (com requirements)
      // ==========================================
      if (input.serviceId) {
        const reqs = await db
          .select({
            resourceTypeId: serviceRequirements.resourceTypeId,
            quantity: serviceRequirements.quantity,
          })
          .from(serviceRequirements)
          .where(eq(serviceRequirements.serviceId, input.serviceId));

        if (!reqs.length) {
          return { ok: false, error: "service_has_no_requirements" };
        }

        requiredTypeIds = reqs.map((r) => r.resourceTypeId);

        // duração do serviço, caso não venha override manual
        if (!durationMinutes) {
          const svcRows = await db
            .select({
              durationMinutes: services.durationMinutes,
            })
            .from(services)
            .where(eq(services.id, input.serviceId))
            .limit(1);

          const svc = svcRows[0];
          if (svc?.durationMinutes && Number(svc.durationMinutes) > 0) {
            durationMinutes = Number(svc.durationMinutes);
          }
        }
      }

      // ==========================================
      // MODO 2: fluxo manual por resource/profissional
      // ==========================================
      if (!input.serviceId) {
        if (!durationMinutes || durationMinutes <= 0) {
          return {
            ok: false,
            error: "service_or_duration_required",
            message: "Informe um serviço ou uma duração válida.",
          };
        }

        if (!input.resourceId) {
          return {
            ok: false,
            error: "resource_not_found",
            message: "ResourceId é obrigatório no modo manual.",
          };
        }

        requiredResourceIds = [input.resourceId];
      }

      if (!durationMinutes || durationMinutes <= 0) {
        durationMinutes = 30;
      }

      // ==========================================
      // Buscar recursos candidatos
      // ==========================================
      let candidates: Array<{
        id: string;
        typeId: string;
      }> = [];

      if (input.serviceId) {
        candidates = await db
          .select({
            id: resources.id,
            typeId: resources.typeId,
          })
          .from(resources)
          .where(
            and(
              eq(resources.companyId, input.companyId),
              inArray(resources.typeId, requiredTypeIds),
              input.resourceId ? eq(resources.id, input.resourceId) : sql`true`,
            ),
          );
      } else {
        candidates = await db
          .select({
            id: resources.id,
            typeId: resources.typeId,
          })
          .from(resources)
          .where(
            and(
              eq(resources.companyId, input.companyId),
              eq(resources.id, input.resourceId!),
            ),
          );
      }

      if (input.resourceId && candidates.length === 0) {
        return { ok: false, error: "resource_not_found" };
      }

      const byType = new Map<string, string[]>();
      for (const c of candidates) {
        const arr = byType.get(c.typeId) ?? [];
        arr.push(c.id);
        byType.set(c.typeId, arr);
      }

      // no modo service, garante capacidade por tipo
      if (input.serviceId) {
        for (const tId of requiredTypeIds) {
          if (!byType.get(tId)?.length) {
            return { ok: false, error: "no_capacity" };
          }
        }
      }

      const weekday = getWeekdayInTz(startTime, DEFAULT_TIMEZONE);
      if (Number.isNaN(weekday)) {
        return { ok: false, error: "invalid_start_time" };
      }

      const candidateIds = candidates.map((c) => c.id);

      const schedRows = await db
        .select({
          resourceId: resourceSchedules.resourceId,
          startTime: resourceSchedules.startTime,
          endTime: resourceSchedules.endTime,
          weekday: resourceSchedules.weekday,
        })
        .from(resourceSchedules)
        .where(
          and(
            inArray(resourceSchedules.resourceId, candidateIds),
            eq(resourceSchedules.weekday, weekday),
          ),
        );

      function resourceWorks(
        resourceId: string,
        slotStart: Date,
        slotEnd: Date,
      ) {
        const rows = schedRows.filter((s) => s.resourceId === resourceId);
        if (!rows.length) return false;

        const startIso = slotStart.toISOString();
        const endIso = slotEnd.toISOString();
        const startDateIso = isoUtcToDateIsoInTz(startIso, DEFAULT_TIMEZONE);
        const endDateIso = isoUtcToDateIsoInTz(endIso, DEFAULT_TIMEZONE);
        if (startDateIso !== endDateIso) return false;

        const slotStartMin = getMinutesInTz(slotStart, DEFAULT_TIMEZONE);
        let slotEndMin = getMinutesInTz(slotEnd, DEFAULT_TIMEZONE);

        if (slotEndMin < slotStartMin) slotEndMin += 1440;

        for (const r of rows) {
          const [aH, aM] = String(r.startTime).split(":").map(Number);
          const [bH, bM] = String(r.endTime).split(":").map(Number);

          if (
            !Number.isFinite(aH) ||
            !Number.isFinite(aM) ||
            !Number.isFinite(bH) ||
            !Number.isFinite(bM)
          ) {
            continue;
          }

          const a = aH * 60 + aM;
          const b = bH * 60 + bM;

          if (slotStartMin >= a && slotEndMin <= b) return true;
        }

        return false;
      }

      const searchStart = startTime;
      const searchEnd = addMinutes(startTime, limit * stepMinutes + 8 * 60);

      const busy = await db
        .select({
          resourceId: bookingItemAllocations.resourceId,
          startTime: bookingItemAllocations.startTime,
          endTime: bookingItemAllocations.endTime,
        })
        .from(bookingItemAllocations)
        .innerJoin(
          bookingItems,
          eq(bookingItems.id, bookingItemAllocations.bookingItemId),
        )
        .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
        .innerJoin(
          resources,
          eq(resources.id, bookingItemAllocations.resourceId),
        )
        .where(
          and(
            eq(resources.companyId, input.companyId),
            inArray(bookings.status as any, ACTIVE_BOOKING_STATUSES as any),
            sql`${bookingItemAllocations.startTime} < ${searchEnd}`,
            sql`${bookingItemAllocations.endTime} > ${searchStart}`,
          ),
        );

      function isBusy(resourceId: string, slotStart: Date, slotEnd: Date) {
        for (const b of busy) {
          if (b.resourceId !== resourceId) continue;
          if (!b.startTime || !b.endTime) continue;

          if (
            overlaps(b.startTime as any, b.endTime as any, slotStart, slotEnd)
          ) {
            return true;
          }
        }
        return false;
      }

      const slots: Slot[] = [];

      for (let i = 0; i < limit; i++) {
        const slotStart = addMinutes(startTime, i * stepMinutes);
        const slotEnd = addMinutes(slotStart, durationMinutes);

        const chosen: string[] = [];
        let ok = true;

        // fluxo por serviço
        if (input.serviceId) {
          for (const typeId of requiredTypeIds) {
            const list = byType.get(typeId) ?? [];
            let picked: string | null = null;

            for (const rid of list) {
              if (!resourceWorks(rid, slotStart, slotEnd)) continue;
              if (isBusy(rid, slotStart, slotEnd)) continue;
              picked = rid;
              break;
            }

            if (!picked) {
              ok = false;
              break;
            }

            chosen.push(picked);
          }
        } else {
          // fluxo manual: um único recurso obrigatório
          const rid = requiredResourceIds[0];

          if (!rid) {
            ok = false;
          } else if (!resourceWorks(rid, slotStart, slotEnd)) {
            ok = false;
          } else if (isBusy(rid, slotStart, slotEnd)) {
            ok = false;
          } else {
            chosen.push(rid);
          }
        }

        if (ok) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            resourceIds: chosen,
          });
        }
      }

      return { ok: true, slots };
    } catch (err: any) {
      return {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Error",
      };
    }
  }

  static async listBusyResources(input: {
    companyId: string;
    startTime: Date;
    endTime: Date;
    typeId?: string;
  }) {
    const db = getDb();

    const rows = await db
      .select({ resourceId: bookingItemAllocations.resourceId })
      .from(bookingItemAllocations)
      .innerJoin(
        bookingItems,
        eq(bookingItems.id, bookingItemAllocations.bookingItemId),
      )
      .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
      .innerJoin(resources, eq(resources.id, bookingItemAllocations.resourceId))
      .where(
        and(
          eq(resources.companyId, input.companyId),
          input.typeId ? eq(resources.typeId, input.typeId) : sql`true`,
          inArray(bookings.status as any, ACTIVE_BOOKING_STATUSES as any),
          sql`${bookingItemAllocations.startTime} < ${input.endTime}`,
          sql`${bookingItemAllocations.endTime} > ${input.startTime}`,
        ),
      );

    return rows.map((r) => r.resourceId);
  }
}
