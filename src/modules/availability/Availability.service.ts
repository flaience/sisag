// src/modules/availability/Availability.service.ts
import { and, eq, inArray, lt, gt, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  schedulingConfig,
  serviceRequirements,
  resources,
  resourceSchedules,
  bookingItemAllocations,
} from "@/drizzle/schema";

type Slot = {
  startTime: string; // ISO
  endTime: string; // ISO
};

function parseDateRangeInSaoPaulo(dateYYYYMMDD: string) {
  const start = new Date(`${dateYYYYMMDD}T00:00:00-03:00`);
  const end = new Date(`${dateYYYYMMDD}T23:59:59.999-03:00`);
  return { start, end };
}

function weekdaySaoPaulo(dateYYYYMMDD: string) {
  const d = new Date(`${dateYYYYMMDD}T12:00:00-03:00`);
  return d.getUTCDay(); // 0-6
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export const AvailabilityService = {
  /**
   * V1: lista resources ocupados em um intervalo
   * Endpoint: /api/v1/availability/resources
   */
  async listBusyResources(input: {
    companyId: string;
    startTime: Date;
    endTime: Date;
    typeId?: string;
  }) {
    const db = getDb();

    const rows = await db
      .select({
        resourceId: bookingItemAllocations.resourceId,
      })
      .from(bookingItemAllocations)
      .innerJoin(resources, eq(resources.id, bookingItemAllocations.resourceId))
      .where(
        and(
          eq(resources.companyId, input.companyId),
          input.typeId ? eq(resources.typeId, input.typeId) : undefined,
          isNotNull(bookingItemAllocations.startTime),
          isNotNull(bookingItemAllocations.endTime),
          lt(bookingItemAllocations.startTime, input.endTime),
          gt(bookingItemAllocations.endTime, input.startTime),
        ),
      );

    const set = new Set(rows.map((r) => r.resourceId));
    return Array.from(set);
  },

  /**
   * V2: lista slots disponíveis para um service em um dia, respeitando:
   * - service_requirements (resourceTypeId + quantity)
   * - resource_schedules (janelas por weekday)
   * - booking_item_allocations (ocupação real)
   *
   * Endpoint: /api/v1/availability/slots
   */
  async listSlots(input: {
    companyId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    resourceId?: string;
  }) {
    const db = getDb();

    // config
    const cfg = await db
      .select()
      .from(schedulingConfig)
      .where(eq(schedulingConfig.companyId, input.companyId))
      .limit(1);

    const slotMinutes = cfg[0]?.slotDurationMinutes ?? 15;
    const bufferMinutes = cfg[0]?.bufferMinutes ?? 0;

    // requirements
    const reqs = await db
      .select({
        resourceTypeId: serviceRequirements.resourceTypeId,
        quantity: serviceRequirements.quantity,
      })
      .from(serviceRequirements)
      .where(eq(serviceRequirements.serviceId, input.serviceId));

    if (!reqs.length) {
      return {
        ok: false as const,
        error: "service_has_no_requirements" as const,
      };
    }

    // recurso forçado (opcional)
    let forcedResource: { id: string; typeId: string } | null = null;
    if (input.resourceId) {
      const r = await db
        .select({ id: resources.id, typeId: resources.typeId })
        .from(resources)
        .where(
          and(
            eq(resources.id, input.resourceId),
            eq(resources.companyId, input.companyId),
          ),
        )
        .limit(1);

      if (!r[0]) {
        return { ok: false as const, error: "resource_not_found" as const };
      }
      forcedResource = r[0];
    }

    const requiredTypeIds = reqs.map((r) => r.resourceTypeId);

    const allResources = await db
      .select({ id: resources.id, typeId: resources.typeId })
      .from(resources)
      .where(
        and(
          eq(resources.companyId, input.companyId),
          inArray(resources.typeId, requiredTypeIds),
          eq(resources.status, "active"),
        ),
      );

    if (forcedResource && !requiredTypeIds.includes(forcedResource.typeId)) {
      return {
        ok: false as const,
        error: "forced_resource_type_not_required" as const,
      };
    }

    const resourceIds = allResources.map((r) => r.id);
    if (!resourceIds.length) {
      return { ok: true as const, slots: [] as Slot[] };
    }

    // schedules do dia
    const wd = weekdaySaoPaulo(input.date);
    const schedules = await db
      .select({
        resourceId: resourceSchedules.resourceId,
        startTime: resourceSchedules.startTime,
        endTime: resourceSchedules.endTime,
      })
      .from(resourceSchedules)
      .where(
        and(
          inArray(resourceSchedules.resourceId, resourceIds),
          eq(resourceSchedules.weekday, wd),
        ),
      );

    const schedByRes = new Map<string, Array<{ start: string; end: string }>>();
    for (const s of schedules) {
      const arr = schedByRes.get(s.resourceId) ?? [];
      arr.push({ start: s.startTime, end: s.endTime });
      schedByRes.set(s.resourceId, arr);
    }

    // busy allocations do dia (1 query)
    const { start: dayStart, end: dayEnd } = parseDateRangeInSaoPaulo(
      input.date,
    );

    const busyRows = await db
      .select({
        resourceId: bookingItemAllocations.resourceId,
        startTime: bookingItemAllocations.startTime,
        endTime: bookingItemAllocations.endTime,
      })
      .from(bookingItemAllocations)
      .where(
        and(
          inArray(bookingItemAllocations.resourceId, resourceIds),
          isNotNull(bookingItemAllocations.startTime),
          isNotNull(bookingItemAllocations.endTime),
          lt(bookingItemAllocations.startTime, dayEnd),
          gt(bookingItemAllocations.endTime, dayStart),
        ),
      );

    const busyByRes = new Map<string, Array<{ start: Date; end: Date }>>();
    for (const b of busyRows) {
      const arr = busyByRes.get(b.resourceId) ?? [];
      arr.push({ start: b.startTime!, end: b.endTime! });
      busyByRes.set(b.resourceId, arr);
    }

    // gerar slots candidatos (MVP)
    const dayMin = new Date(`${input.date}T06:00:00-03:00`);
    const dayMax = new Date(`${input.date}T22:00:00-03:00`);

    const slots: Slot[] = [];

    for (
      let cursor = dayMin;
      addMinutes(cursor, slotMinutes) <= dayMax;
      cursor = addMinutes(cursor, slotMinutes)
    ) {
      const slotStart = cursor;
      const slotEnd = addMinutes(cursor, slotMinutes);

      const checkStart = addMinutes(slotStart, -bufferMinutes);
      const checkEnd = addMinutes(slotEnd, bufferMinutes);

      let ok = true;

      for (const req of reqs) {
        let candidates = allResources
          .filter((r) => r.typeId === req.resourceTypeId)
          .map((r) => r.id);

        if (forcedResource && forcedResource.typeId === req.resourceTypeId) {
          candidates = [forcedResource.id];
        }

        // schedule cobre slot
        candidates = candidates.filter((rid) => {
          const windows = schedByRes.get(rid);
          if (!windows?.length) return false;
          for (const w of windows) {
            const wStart = new Date(`${input.date}T${w.start}:00-03:00`);
            const wEnd = new Date(`${input.date}T${w.end}:00-03:00`);
            if (slotStart >= wStart && slotEnd <= wEnd) return true;
          }
          return false;
        });

        if (candidates.length < req.quantity) {
          ok = false;
          break;
        }

        const free = candidates.filter((rid) => {
          const busy = busyByRes.get(rid) ?? [];
          for (const b of busy) {
            if (overlap(checkStart, checkEnd, b.start, b.end)) return false;
          }
          return true;
        });

        if (free.length < req.quantity) {
          ok = false;
          break;
        }
      }

      if (ok) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }
    }

    return { ok: true as const, slots };
  },
};
