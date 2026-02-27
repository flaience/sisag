// src/modules/availability/Availability.service.ts
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookingItemAllocations,
  resourceSchedules,
  resources,
  serviceRequirements,
} from "@/drizzle/schema";

type ListSlotsInput = {
  companyId: string;
  serviceId: string;

  /** Data/hora desejada (início do slot) */
  startTime: Date;

  /**
   * Opcional: força testar disponibilidade somente deste recurso (uuid)
   * (útil pra debug / escolha direta)
   */
  resourceId?: string;

  /**
   * Quantidade de slots para sugerir (a partir de startTime).
   * Default: 6
   */
  limit?: number;

  /**
   * Quantos minutos de step entre slots sugeridos.
   * Default: 15
   */
  stepMinutes?: number;
};

type Slot = {
  startTime: string; // ISO
  endTime: string; // ISO
  resourceIds: string[]; // recursos que podem atender esse slot (na prática, 1 por tipo exigido)
};

type ListSlotsOk = { ok: true; slots: Slot[] };
type ListSlotsErr = {
  ok: false;
  error:
    | "company_id_required"
    | "service_id_required"
    | "invalid_start_time"
    | "service_has_no_requirements"
    | "resource_not_found"
    | "no_capacity"
    | "internal_error";
  message?: string;
};

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  // intervalo [start, end) (igual tstzrange '[)')
  return aStart < bEnd && aEnd > bStart;
}

export class AvailabilityService {
  /**
   * Retorna uma lista pequena de slots disponíveis a partir de startTime,
   * considerando:
   * - requirements do serviço (service_requirements)
   * - agenda do recurso (resource_schedules) no weekday
   * - conflitos por overlap em booking_item_allocations (start_time/end_time)
   *
   * IMPORTANTE:
   * - Este método é "sem IA" e determinístico.
   * - Para o MVP conversacional, é suficiente sugerir N opções.
   */
  static async listSlots(
    input: ListSlotsInput,
  ): Promise<ListSlotsOk | ListSlotsErr> {
    try {
      if (!input.companyId) return { ok: false, error: "company_id_required" };
      if (!input.serviceId) return { ok: false, error: "service_id_required" };

      const startTime = input.startTime;
      if (!(startTime instanceof Date) || Number.isNaN(startTime.getTime())) {
        return { ok: false, error: "invalid_start_time" };
      }

      const limit = input.limit ?? 6;
      const stepMinutes = input.stepMinutes ?? 15;

      const db = getDb();

      // 1) requirements do serviço (tipos de recurso + qty)
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

      // MVP: só suportamos qty=1 por tipo (se vier >1, dá pra evoluir depois)
      // mas não vamos quebrar — apenas trataremos como 1 por enquanto.
      const requiredTypeIds = reqs.map((r) => r.resourceTypeId);

      // 2) lista de recursos candidatos (company + types)
      const candidates = await db
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

      if (input.resourceId && candidates.length === 0) {
        return { ok: false, error: "resource_not_found" };
      }

      // group por type
      const byType = new Map<string, string[]>();
      for (const c of candidates) {
        const arr = byType.get(c.typeId) ?? [];
        arr.push(c.id);
        byType.set(c.typeId, arr);
      }

      // se faltar algum tipo exigido => sem capacidade
      for (const tId of requiredTypeIds) {
        if (!byType.get(tId)?.length)
          return { ok: false, error: "no_capacity" };
      }

      // 3) pega schedules do weekday para os recursos candidatos
      const weekday = startTime.getDay(); // 0-6
      if (Number.isNaN(weekday)) {
        return { ok: false, error: "invalid_start_time" };
      }

      const candidateIds = candidates.map((c) => c.id);
      const schedRows = await db
        .select({
          resourceId: resourceSchedules.resourceId,
          startTime: resourceSchedules.startTime, // text "08:00"
          endTime: resourceSchedules.endTime, // text "12:00"
          weekday: resourceSchedules.weekday,
        })
        .from(resourceSchedules)
        .where(
          and(
            inArray(resourceSchedules.resourceId, candidateIds),
            eq(resourceSchedules.weekday, weekday),
          ),
        );

      // helper: verifica se um recurso trabalha nesse horário
      function resourceWorks(
        resourceId: string,
        slotStart: Date,
        slotEnd: Date,
      ) {
        // schedules são "text" (HH:MM). Vamos comparar com o horário local do slot.
        const rows = schedRows.filter((s) => s.resourceId === resourceId);
        if (!rows.length) return false;

        const sh = slotStart.getHours();
        const sm = slotStart.getMinutes();
        const eh = slotEnd.getHours();
        const em = slotEnd.getMinutes();

        const slotStartMin = sh * 60 + sm;
        const slotEndMin = eh * 60 + em;

        for (const r of rows) {
          const [aH, aM] = String(r.startTime)
            .split(":")
            .map((x) => Number(x));
          const [bH, bM] = String(r.endTime)
            .split(":")
            .map((x) => Number(x));
          if (
            !Number.isFinite(aH) ||
            !Number.isFinite(aM) ||
            !Number.isFinite(bH) ||
            !Number.isFinite(bM)
          )
            continue;

          const a = aH * 60 + aM;
          const b = bH * 60 + bM;

          // janela [a,b)
          if (slotStartMin >= a && slotEndMin <= b) return true;
        }
        return false;
      }

      // 4) conflitos existentes (allocations) para a janela que vamos testar
      // janela de busca = startTime até startTime + (limit * step + 8h) (safe)
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
          resources,
          eq(resources.id, bookingItemAllocations.resourceId),
        )
        .where(
          and(
            eq(resources.companyId, input.companyId),
            // overlap: alloc.start < searchEnd AND alloc.end > searchStart
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
          )
            return true;
        }
        return false;
      }

      // 5) montar slots: para cada slot candidato, escolhe 1 recurso por tipo exigido
      // OBS: duração do serviço — no MVP conversacional vamos inferir pela primeira requirement?
      // Melhor: você já tem duration no "services". Mas como schema que você colou não inclui
      // aqui, vou assumir 30min default se não vier.
      // Se quiser, me diga onde está a tabela services no schema (já está) e eu puxo durationMinutes.
      let durationMinutes = 30;

      // tenta buscar duração do serviço se existir coluna durationMinutes
      try {
        // "services" existe no schema que você colou; vamos usar SQL raw pra não depender do import.
        const q = await db.execute(sql`
          select duration_minutes as "duration"
          from services
          where id = ${input.serviceId}::uuid
          limit 1
        `);
        const row = (q as any).rows?.[0];
        if (row?.duration && Number(row.duration) > 0)
          durationMinutes = Number(row.duration);
      } catch {
        // ignora e segue com default
      }

      const slots: Slot[] = [];
      for (let i = 0; i < limit; i++) {
        const slotStart = addMinutes(startTime, i * stepMinutes);
        const slotEnd = addMinutes(slotStart, durationMinutes);

        // seleciona 1 recurso por tipo exigido que:
        // - trabalha no horário
        // - não está ocupado por overlap
        const chosen: string[] = [];

        let ok = true;
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
      // mantém padrão do projeto
      return {
        ok: false,
        error: "internal_error",
        message: err?.message ?? "Error",
      };
    }
  }

  /**
   * Utilitário: retorna os resourceIds ocupados no intervalo.
   * (Pode ser usado em rotas admin/debug)
   */
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
      .innerJoin(resources, eq(resources.id, bookingItemAllocations.resourceId))
      .where(
        and(
          eq(resources.companyId, input.companyId),
          input.typeId ? eq(resources.typeId, input.typeId) : sql`true`,
          sql`${bookingItemAllocations.startTime} < ${input.endTime}`,
          sql`${bookingItemAllocations.endTime} > ${input.startTime}`,
        ),
      );

    return rows.map((r) => r.resourceId);
  }
}
