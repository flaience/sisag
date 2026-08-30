//src/modules/bookings/Booking.service.ts
import { getDb } from "@/lib/db";
import { resolveBookingUnit } from "./BookingUnit.resolver";
import {
  bookings,
  bookingItems,
  bookingItemAllocations,
  bookingEvents,
  automationJobs,
  conversationSessions,
  messageLogs,
  clients,
  services,
  serviceRequirements,
  resources,
  professionals,
} from "@/drizzle/schema";
import {
  or,
  ilike,
  and,
  desc,
  eq,
  gt,
  inArray,
  count,
  lt,
  sql,
} from "drizzle-orm";

/* =====================================================
   TYPES
===================================================== */
type Ok<T extends object> = { ok: true } & T;
type Err<E extends string> = { ok: false; error: E; message?: string };

type CreateAutoInput = {
  companyId: string;
  clientId: string;
  professionalId?: string;
  unitId?: string;
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
  | Ok<{
      bookingId: string;
      oldStartTime: string;
      newStartTime: string;
      status: string;
    }>
  | Err<
      | "company_id_required"
      | "booking_id_required"
      | "new_start_time_required"
      | "invalid_start_time"
      | "booking_not_found"
      | "booking_not_reschedulable"
      | "booking_has_no_items"
      | "service_not_found"
      | "service_has_no_requirements"
      | "resource_not_found"
      | "slot_taken"
      | "internal_error"
    >;

type RecreateByIdInput = {
  bookingId: string;
  companyId: string;
  newStartTime: string;
  actor?: "admin" | "system" | "whatsapp" | "n8n";
  reason?: string | null;
};

type RecreateByIdResult =
  | Ok<{
      originalBookingId: string;
      newBookingId: string;
      startTime: string;
      status: string;
    }>
  | Err<
      | "company_id_required"
      | "booking_id_required"
      | "new_start_time_required"
      | "invalid_start_time"
      | "booking_not_found"
      | "booking_not_recreatable"
      | "service_not_found"
      | "booking_has_no_items"
      | "client_id_required"
      | "service_id_required"
      | "start_time_required"
      | "service_has_no_requirements"
      | "resource_not_found"
      | "slot_taken"
      | "internal_error"
    >;
/* =====================================================
   HELPERS - JOURNEY / EXPERIENCE
===================================================== */

type ListBookingsInput = {
  search?: string;
  status?: string;
};

type ListBookingsResult = {
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    rescheduled: number;
  };
  bookings: Array<{
    id: string;
    companyId: string;
    clientId: string;
    startTime: string;
    status: string;
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    client: {
      name: string | null;
      phone: string | null;
      email: string | null;
    };
    primaryItem: {
      serviceId: string;
      serviceName: string | null;
      durationMinutes: number;
    } | null;
    itemsCount: number;
    messageCount: number;
  }>;
};
function getLatestMessage(
  messages: Array<{
    id: string;
    channel: string;
    provider: string;
    toPhone: string;
    messageType: string;
    body: string;
    status: string;
    providerMessageId: string | null;
    error: string | null;
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
    failedAt: Date | null;
    createdAt: Date | null;
  }>,
) {
  return messages[0] ?? null;
}

function getNextAutomationJob(
  jobs: Array<{
    id: string;
    type: string;
    status: string;
    runAt: Date;
    attempts: number;
    lastError: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>,
) {
  if (!jobs.length) return null;

  const sorted = [...jobs].sort(
    (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime(),
  );

  return sorted[0] ?? null;
}

function getExperienceSummary(input: {
  bookingStatus: string;
  allocationCount: number;
  eventCount: number;
  jobCount: number;
  hasMessages: boolean;
}) {
  const status = input.bookingStatus?.toUpperCase?.() ?? "";

  const preBase =
    input.allocationCount > 0
      ? "Recursos já previstos para o atendimento."
      : "Ainda sem recursos previstos para o atendimento.";

  const duringBase =
    input.eventCount > 0
      ? "A jornada já possui eventos registrados."
      : "Ainda não há eventos registrados nesta jornada.";

  const postBase =
    input.jobCount > 0
      ? "Existem automações planejadas para continuidade da experiência."
      : "Ainda não há automações configuradas para continuidade da experiência.";

  if (status.includes("CONFIRMED")) {
    return {
      preTitle: "Atendimento confirmado",
      preText: input.hasMessages
        ? `${preBase} O cliente já recebeu comunicação e o atendimento está bem posicionado para acontecer com previsibilidade.`
        : `${preBase} O atendimento está confirmado, mas ainda vale reforçar a comunicação prévia.`,
      duringText: duringBase,
      postTitle: "Valorização após o atendimento",
      postText:
        input.jobCount > 0
          ? `${postBase} Já existem ações planejadas para manter o relacionamento após o serviço.`
          : `${postBase} Depois do atendimento, vale ativar follow-up, feedback e valorização do cliente.`,
    };
  }

  if (status.includes("PENDING")) {
    return {
      preTitle: "Confirmação em construção",
      preText: `${preBase} Este é um bom momento para reforçar previsão do serviço, preparo do cliente e mensagem de confirmação.`,
      duringText: duringBase,
      postTitle: "Pós-atendimento ainda não iniciado",
      postText: `${postBase} A jornada posterior pode ser preparada desde agora com automações e próximos passos.`,
    };
  }

  if (status.includes("CANCELLED")) {
    return {
      preTitle: "Jornada interrompida",
      preText: `${preBase} O atendimento foi interrompido. A melhor ação costuma ser retomar o contato e oferecer novo caminho ao cliente.`,
      duringText: duringBase,
      postTitle: "Relacionamento a recuperar",
      postText: `${postBase} Aqui pode entrar uma estratégia de reconquista, reativação e acolhimento do cliente.`,
    };
  }

  return {
    preTitle: "Pré-atendimento",
    preText: `${preBase} A jornada prévia pode alinhar expectativa, previsibilidade e segurança para o cliente.`,
    duringText: duringBase,
    postTitle: "Pós-atendimento",
    postText: `${postBase} O pós-atendimento pode fortalecer percepção de cuidado e valor.`,
  };
}

function formatDatePtBr(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function formatTimePtBr(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSuggestedPreMessage(input: {
  clientName?: string | null;
  serviceName?: string | null;
  startTime: Date | string;
}) {
  const clientName = input.clientName?.trim() || "cliente";
  const serviceName = input.serviceName?.trim() || "atendimento";
  const date = formatDatePtBr(input.startTime);
  const time = formatTimePtBr(input.startTime);

  return `Olá, ${clientName}! Seu ${serviceName} está previsto para ${date} às ${time}. Se precisar de qualquer orientação antes do atendimento, estamos à disposição para ajudar.`;
}

function getSuggestedPostMessage(input: {
  clientName?: string | null;
  serviceName?: string | null;
}) {
  const clientName = input.clientName?.trim() || "cliente";
  const serviceName = input.serviceName?.trim() || "atendimento";

  return `Olá, ${clientName}! Esperamos que sua experiência com o ${serviceName} tenha sido excelente. Seu retorno é muito importante para continuarmos oferecendo um atendimento cada vez mais cuidadoso.`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

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

      // -------------------------------------------------
      // 1) Se veio professionalId, respeitar esse recurso
      // -------------------------------------------------
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

      // -------------------------------------------------
      // 2) Completar os demais requisitos do serviço
      // -------------------------------------------------
      for (const req of reqs) {
        if (satisfiedRequirementIds.has(req.id)) {
          continue;
        }

        const resourceRows = await db
          .select({
            id: resources.id,
          })
          .from(resources)
          .where(eq(resources.typeId, req.resourceTypeId))
          .limit(1);

        const resource = resourceRows[0];
        if (!resource) return { ok: false, error: "resource_not_found" };

        resourceIds.push(resource.id);
      }

      const unitId = await resolveBookingUnit({
        companyId: input.companyId,
        professionalId: input.professionalId,
        unitId: input.unitId,
      });
      if (!unitId) return { ok: false, error: "unit_not_available" };

      // -------------------------------------------------
      // 3) Validar conflitos de todos os recursos
      // -------------------------------------------------
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

      // -------------------------------------------------
      // 4) Criar booking, item, allocations e evento
      // -------------------------------------------------
      const result = await db.transaction(async (tx) => {
        const bookingInserted = await tx
          .insert(bookings)
          .values({
            companyId: input.companyId,
            clientId: input.clientId,
            unitId,
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
      console.error("BookingService.createAuto error:", err);
      return { ok: false, error: "internal_error" };
    }
  }

  /* =====================================================
     RESCHEDULE BY ID
  ===================================================== */

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
          notes: bookings.notes,
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
      if (!booking) {
        return { ok: false, error: "booking_not_found" };
      }

      const bookingStatus = booking.status?.toUpperCase?.() ?? "";
      if (!["PENDING", "CONFIRMED"].includes(bookingStatus)) {
        return {
          ok: false,
          error: "booking_not_reschedulable",
          message:
            "Somente bookings pendentes ou confirmados podem ser reagendados.",
        };
      }

      const items = await db
        .select({
          id: bookingItems.id,
          bookingId: bookingItems.bookingId,
          serviceId: bookingItems.serviceId,
          durationMinutes: bookingItems.durationMinutes,
          startTime: bookingItems.startTime,
          endTime: bookingItems.endTime,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, input.bookingId));

      if (!items.length) {
        return {
          ok: false,
          error: "booking_has_no_items",
          message: "O booking não possui itens para reagendamento.",
        };
      }

      const primaryItem = items[0];

      const serviceRows = await db
        .select({
          id: services.id,
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(eq(services.id, primaryItem.serviceId))
        .limit(1);

      const service = serviceRows[0];
      if (!service) {
        return { ok: false, error: "service_not_found" };
      }

      const reqs = await db
        .select({
          id: serviceRequirements.id,
          resourceTypeId: serviceRequirements.resourceTypeId,
          quantity: serviceRequirements.quantity,
        })
        .from(serviceRequirements)
        .where(eq(serviceRequirements.serviceId, primaryItem.serviceId));

      if (!reqs.length) {
        return { ok: false, error: "service_has_no_requirements" };
      }

      const newEnd = addMinutes(newStart, primaryItem.durationMinutes);

      const oldAllocations = await db
        .select({
          id: bookingItemAllocations.id,
          bookingItemId: bookingItemAllocations.bookingItemId,
          resourceId: bookingItemAllocations.resourceId,
          startTime: bookingItemAllocations.startTime,
          endTime: bookingItemAllocations.endTime,
          resourceName: resources.name,
        })
        .from(bookingItemAllocations)
        .leftJoin(
          resources,
          eq(resources.id, bookingItemAllocations.resourceId),
        )
        .where(eq(bookingItemAllocations.bookingItemId, primaryItem.id));

      const snapshotBefore = {
        bookingId: booking.id,
        oldStartTime: booking.startTime,
        status: booking.status,
        items: items.map((item) => ({
          id: item.id,
          serviceId: item.serviceId,
          durationMinutes: item.durationMinutes,
          startTime: item.startTime,
          endTime: item.endTime,
        })),
        allocations: oldAllocations.map((allocation) => ({
          id: allocation.id,
          bookingItemId: allocation.bookingItemId,
          resourceId: allocation.resourceId,
          resourceName: allocation.resourceName,
          startTime: allocation.startTime,
          endTime: allocation.endTime,
        })),
      };

      const newResourceIds: string[] = [];

      for (const req of reqs) {
        const candidateResources = await db
          .select({
            id: resources.id,
            name: resources.name,
          })
          .from(resources)
          .where(eq(resources.typeId, req.resourceTypeId));

        if (!candidateResources.length) {
          return { ok: false, error: "resource_not_found" };
        }

        let selectedResourceId: string | null = null;

        for (const candidate of candidateResources) {
          const conflictRows = await db
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
                inArray(bookings.status as any, ["PENDING", "CONFIRMED"]),
                lt(bookingItemAllocations.startTime, newEnd),
                gt(bookingItemAllocations.endTime, newStart),
                sql`${bookingItems.bookingId} <> ${input.bookingId}::uuid`,
              ),
            )
            .limit(1);

          if (conflictRows.length === 0) {
            selectedResourceId = candidate.id;
            break;
          }
        }

        if (!selectedResourceId) {
          return {
            ok: false,
            error: "slot_taken",
            message: "Não há recursos disponíveis para o novo horário.",
          };
        }

        newResourceIds.push(selectedResourceId);
      }

      const result = await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({
            startTime: newStart,
            updatedAt: new Date(),
          } as any)
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.companyId, input.companyId),
            ),
          );

        await tx
          .update(bookingItems)
          .set({
            startTime: newStart,
            endTime: newEnd,
          } as any)
          .where(eq(bookingItems.id, primaryItem.id));

        await tx.execute(sql`
        delete from booking_item_allocations
        where booking_item_id = ${primaryItem.id}::uuid;
      `);

        for (const resourceId of newResourceIds) {
          await tx.insert(bookingItemAllocations).values({
            bookingItemId: primaryItem.id,
            resourceId,
            startTime: newStart,
            endTime: newEnd,
          });
        }

        const newAllocations = await tx
          .select({
            resourceId: bookingItemAllocations.resourceId,
            startTime: bookingItemAllocations.startTime,
            endTime: bookingItemAllocations.endTime,
            resourceName: resources.name,
          })
          .from(bookingItemAllocations)
          .leftJoin(
            resources,
            eq(resources.id, bookingItemAllocations.resourceId),
          )
          .where(eq(bookingItemAllocations.bookingItemId, primaryItem.id));

        const snapshotAfter = {
          bookingId: booking.id,
          newStartTime: newStart,
          status: booking.status,
          items: [
            {
              id: primaryItem.id,
              serviceId: primaryItem.serviceId,
              durationMinutes: primaryItem.durationMinutes,
              startTime: newStart,
              endTime: newEnd,
            },
          ],
          allocations: newAllocations.map((allocation) => ({
            resourceId: allocation.resourceId,
            resourceName: allocation.resourceName,
            startTime: allocation.startTime,
            endTime: allocation.endTime,
          })),
        };

        await tx.insert(bookingEvents).values({
          companyId: booking.companyId,
          bookingId: booking.id,
          clientId: booking.clientId,
          type: "booking.rescheduled",
          actor: input.actor ?? "admin",
          payload: {
            reason: input.reason ?? null,
            before: snapshotBefore,
            after: snapshotAfter,
          },
        });

        return {
          bookingId: booking.id,
          oldStartTime: new Date(booking.startTime).toISOString(),
          newStartTime: newStart.toISOString(),
          status: booking.status,
        };
      });

      return {
        ok: true,
        ...result,
      };
    } catch (err) {
      console.error("BookingService.rescheduleById error:", err);
      return {
        ok: false,
        error: "internal_error",
        message: "Erro interno ao reagendar booking.",
      };
    }
  }

  /* =====================================================
     JOURNEY
  ===================================================== */

  static async getJourney(bookingId: string, companyId?: string) {
    const db = getDb();

    const bookingRows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        startTime: bookings.startTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,

        clientName: clients.name,
        clientPhone: clients.phoneE164,
        clientEmail: clients.email,
      })
      .from(bookings)
      .leftJoin(clients, eq(clients.id, bookings.clientId))
      .where(
        companyId
          ? and(eq(bookings.id, bookingId), eq(bookings.companyId, companyId))
          : eq(bookings.id, bookingId),
      )
      .limit(1);

    const booking = bookingRows[0] ?? null;

    if (!booking) {
      return null;
    }

    const items = await db
      .select({
        id: bookingItems.id,
        bookingId: bookingItems.bookingId,
        serviceId: bookingItems.serviceId,
        serviceName: services.name,
        durationMinutes: bookingItems.durationMinutes,
        price: bookingItems.price,
        startTime: bookingItems.startTime,
        endTime: bookingItems.endTime,
        createdAt: bookingItems.createdAt,
      })
      .from(bookingItems)
      .leftJoin(services, eq(services.id, bookingItems.serviceId))
      .where(eq(bookingItems.bookingId, bookingId));

    const itemIds = items.map((item) => item.id);

    const allocations =
      itemIds.length > 0
        ? await db
            .select({
              id: bookingItemAllocations.id,
              bookingItemId: bookingItemAllocations.bookingItemId,
              resourceId: bookingItemAllocations.resourceId,
              resourceName: resources.name,
              startTime: bookingItemAllocations.startTime,
              endTime: bookingItemAllocations.endTime,
              createdAt: bookingItemAllocations.createdAt,
            })
            .from(bookingItemAllocations)
            .leftJoin(
              resources,
              eq(resources.id, bookingItemAllocations.resourceId),
            )
            .where(inArray(bookingItemAllocations.bookingItemId, itemIds))
        : [];
    const allocationResourceIds = allocations.map(
      (allocation) => allocation.resourceId,
    );

    const professionalResources =
      allocationResourceIds.length > 0
        ? await db
            .select({
              professionalId: professionals.id,
              professionalName: professionals.name,
              resourceId: professionals.resourceId,
            })
            .from(professionals)
            .where(inArray(professionals.resourceId, allocationResourceIds))
        : [];

    const primaryProfessionalResource = professionalResources[0] ?? null;

    const events = await db
      .select({
        id: bookingEvents.id,
        type: bookingEvents.type,
        actor: bookingEvents.actor,
        payload: bookingEvents.payload,
        createdAt: bookingEvents.createdAt,
        outboxId: bookingEvents.outboxId,
        sessionId: bookingEvents.sessionId,
      })
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, bookingId))
      .orderBy(desc(bookingEvents.createdAt));

    const jobs = await db
      .select({
        id: automationJobs.id,
        type: automationJobs.type,
        status: automationJobs.status,
        runAt: automationJobs.runAt,
        attempts: automationJobs.attempts,
        lastError: automationJobs.lastError,
        createdAt: automationJobs.createdAt,
        updatedAt: automationJobs.updatedAt,
      })
      .from(automationJobs)
      .where(eq(automationJobs.bookingId, bookingId))
      .orderBy(desc(automationJobs.createdAt));

    const sessions = await db
      .select({
        id: conversationSessions.id,
        status: conversationSessions.status,
        context: conversationSessions.context,
        createdAt: conversationSessions.createdAt,
        updatedAt: conversationSessions.updatedAt,
      })
      .from(conversationSessions)
      .where(
        and(
          eq(conversationSessions.companyId, booking.companyId),
          eq(conversationSessions.clientId, booking.clientId),
        ),
      )
      .orderBy(desc(conversationSessions.updatedAt));

    const logs = booking.clientPhone
      ? await db
          .select({
            id: messageLogs.id,
            channel: messageLogs.channel,
            provider: messageLogs.provider,
            toPhone: messageLogs.toPhone,
            messageType: messageLogs.messageType,
            body: messageLogs.body,
            status: messageLogs.status,
            providerMessageId: messageLogs.providerMessageId,
            error: messageLogs.error,
            sentAt: messageLogs.sentAt,
            deliveredAt: messageLogs.deliveredAt,
            readAt: messageLogs.readAt,
            failedAt: messageLogs.failedAt,
            createdAt: messageLogs.createdAt,
          })
          .from(messageLogs)
          .where(
            and(
              eq(messageLogs.companyId, booking.companyId),
              eq(messageLogs.toPhone, booking.clientPhone),
            ),
          )
          .orderBy(desc(messageLogs.createdAt))
          .limit(20)
      : [];

    const lastMessage = getLatestMessage(logs);
    const nextAutomationJob = getNextAutomationJob(jobs);

    const experienceSummary = getExperienceSummary({
      bookingStatus: booking.status,
      allocationCount: allocations.length,
      eventCount: events.length,
      jobCount: jobs.length,
      hasMessages: logs.length > 0,
    });
    const primaryServiceName = items[0]?.serviceName ?? null;

    const suggestedPreMessage = getSuggestedPreMessage({
      clientName: booking.clientName,
      serviceName: primaryServiceName,
      startTime: booking.startTime,
    });

    const suggestedPostMessage = getSuggestedPostMessage({
      clientName: booking.clientName,
      serviceName: primaryServiceName,
    });

    return {
      booking: {
        id: booking.id,
        companyId: booking.companyId,
        clientId: booking.clientId,
        startTime: booking.startTime,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      client: {
        id: booking.clientId,
        name: booking.clientName,
        phone: booking.clientPhone,
        email: booking.clientEmail,
      },
      items,
      allocations,
      events,
      automationJobs: jobs,
      conversationSessions: sessions,
      messageLogs: logs,
      lastMessage,
      nextAutomationJob,
      experienceSummary,
      suggestedPreMessage,
      suggestedPostMessage,

      rescheduleTarget: primaryProfessionalResource
        ? {
            professionalId: primaryProfessionalResource.professionalId,
            professionalName: primaryProfessionalResource.professionalName,
            resourceId: primaryProfessionalResource.resourceId,
          }
        : null,
    };
  }

  static async sendJourneyMessage(input: {
    bookingId: string;
    companyId: string;
    type?: "pre" | "post";
    text?: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
  }) {
    if (!input.companyId) {
      return {
        ok: false as const,
        error: "company_id_required",
        message: "Empresa é obrigatória.",
      };
    }

    const journey = await BookingService.getJourney(input.bookingId);

    if (!journey) {
      return {
        ok: false as const,
        error: "booking_not_found",
        message: "Booking não encontrado.",
      };
    }

    if (journey.booking.companyId !== input.companyId) {
      return {
        ok: false as const,
        error: "booking_not_found",
        message: "Booking não encontrado.",
      };
    }

    const companyId = journey.booking.companyId;
    const clientId = journey.client.id;
    const toPhone = journey.client.phone;

    if (!companyId || !clientId || !toPhone) {
      return {
        ok: false as const,
        error: "missing_phone",
        message: "Cliente sem telefone para envio.",
      };
    }

    let text: string | null = null;

    if (input.text?.trim()) {
      text = input.text.trim();
    } else if (input.type === "pre") {
      text = journey.suggestedPreMessage ?? null;
    } else if (input.type === "post") {
      text = journey.suggestedPostMessage ?? null;
    }

    if (!text) {
      return {
        ok: false as const,
        error: "message_not_available",
        message: "Não foi possível montar a mensagem.",
      };
    }

    const { outboxInsert } = await import("@/modules/outbox/outbox.repository");

    await outboxInsert({
      aggregateType: "booking",
      aggregateId: input.bookingId,
      eventType: "whatsapp.send.requested" as any,
      payload: {
        companyId,
        toPhone,
        text,
        clientId,
        correlationId: null,
        meta: {
          source: "api",
          emittedAt: new Date().toISOString(),
          bookingId: input.bookingId,
          messageKind: input.type ?? "custom",
        },
      },
    });

    return {
      ok: true as const,
      bookingId: input.bookingId,
      clientId,
      toPhone,
      message: "Mensagem enviada para o fluxo do SISAG.",
    };
  }

  /* =====================================================
     CONFIRM LATEST
  ===================================================== */

  static async confirmLatestPending(input: {
    companyId: string;
    clientId: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
  }) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const rows = await tx
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
      if (!b) {
        return { ok: false as const, error: "no_pending_booking" as const };
      }

      await tx
        .update(bookings)
        .set({ status: "CONFIRMED", updatedAt: new Date() } as any)
        .where(eq(bookings.id, b.id));

      await tx.insert(bookingEvents).values({
        companyId: input.companyId,
        bookingId: b.id,
        clientId: input.clientId,
        type: "booking.confirmed",
        actor: input.actor ?? "admin",
        payload: {
          bookingId: b.id,
          confirmedAt: new Date().toISOString(),
          startTime: b.startTime,
        },
      });

      return {
        ok: true as const,
        bookingId: b.id,
        startTime: b.startTime,
      };
    });
  }

  /* =====================================================
     CANCEL LATEST
  ===================================================== */

  static async cancelLatest(input: {
    companyId: string;
    clientId: string;
    actor?: "admin" | "system" | "whatsapp" | "n8n";
    reason?: string | null;
  }) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      const rows = await tx
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
      if (!b) {
        return { ok: false as const, error: "no_active_booking" as const };
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
        where bi.booking_id = ${b.id}::uuid
      `);

      const allocationsBefore = (allocationRows as any).rows ?? [];

      await tx
        .update(bookings)
        .set({ status: "CANCELLED", updatedAt: new Date() } as any)
        .where(eq(bookings.id, b.id));

      await tx.execute(sql`
        delete from booking_item_allocations a
        using booking_items bi
        where a.booking_item_id = bi.id
          and bi.booking_id = ${b.id}::uuid;
      `);

      await tx.insert(bookingEvents).values({
        companyId: input.companyId,
        bookingId: b.id,
        clientId: input.clientId,
        type: "booking.cancelled",
        actor: input.actor ?? "admin",
        payload: {
          bookingId: b.id,
          cancelledAt: new Date().toISOString(),
          previousStatus: b.status,
          startTime: b.startTime,
          reason: input.reason ?? null,
          releasedAllocations: allocationsBefore,
        },
      });

      return {
        ok: true as const,
        bookingId: b.id,
        startTime: b.startTime,
      };
    });
  }

  /* =====================================================
     CONFIRM BY ID
  ===================================================== */

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

  /* =====================================================
     CANCEL BY ID
  ===================================================== */

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

  static async recreateById(
    input: RecreateByIdInput,
  ): Promise<RecreateByIdResult> {
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

      const parsedStartTime = new Date(input.newStartTime);
      if (Number.isNaN(parsedStartTime.getTime())) {
        return { ok: false, error: "invalid_start_time" };
      }

      const db = getDb();

      const bookingRows = await db
        .select({
          id: bookings.id,
          companyId: bookings.companyId,
          clientId: bookings.clientId,
          status: bookings.status,
          notes: bookings.notes,
          startTime: bookings.startTime,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.companyId, input.companyId),
          ),
        )
        .limit(1);

      const originalBooking = bookingRows[0];

      if (!originalBooking) {
        return { ok: false, error: "booking_not_found" };
      }

      const bookingStatus = originalBooking.status?.toUpperCase?.() ?? "";
      if (bookingStatus !== "CANCELLED") {
        return {
          ok: false,
          error: "booking_not_recreatable",
          message: "Somente bookings cancelados podem ser retomados.",
        };
      }

      const itemRows = await db
        .select({
          serviceId: bookingItems.serviceId,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, input.bookingId))
        .limit(1);

      const firstItem = itemRows[0];

      if (!firstItem) {
        return {
          ok: false,
          error: "booking_has_no_items",
          message: "O booking original não possui itens.",
        };
      }

      if (!firstItem.serviceId) {
        return {
          ok: false,
          error: "service_not_found",
          message: "Serviço do booking original não encontrado.",
        };
      }

      const created = await BookingService.createAuto({
        companyId: originalBooking.companyId,
        clientId: originalBooking.clientId,
        serviceId: firstItem.serviceId,
        startTime: input.newStartTime,
        notes: originalBooking.notes ?? undefined,
      });

      if (created.ok === false) {
        switch (created.error) {
          case "company_id_required":
            return { ok: false, error: "company_id_required" };

          case "client_id_required":
            return { ok: false, error: "client_id_required" };

          case "service_id_required":
            return { ok: false, error: "service_id_required" };

          case "start_time_required":
            return { ok: false, error: "start_time_required" };

          case "invalid_start_time":
            return { ok: false, error: "invalid_start_time" };

          case "service_not_found":
            return { ok: false, error: "service_not_found" };

          case "service_has_no_requirements":
            return { ok: false, error: "service_has_no_requirements" };

          case "resource_not_found":
            return { ok: false, error: "resource_not_found" };

          case "slot_taken":
            return {
              ok: false,
              error: "slot_taken",
              message:
                "Não há disponibilidade para recriar o booking neste horário.",
            };

          case "professional_not_found":
          case "professional_has_no_resource":
          case "professional_not_compatible":
          case "internal_error":
          default:
            return {
              ok: false,
              error: "internal_error",
              message: "Erro interno ao recriar booking.",
            };
        }
      }

      await db.transaction(async (tx) => {
        await tx.insert(bookingEvents).values({
          companyId: originalBooking.companyId,
          bookingId: originalBooking.id,
          clientId: originalBooking.clientId,
          type: "booking.recreated_origin",
          actor: input.actor ?? "admin",
          payload: {
            originalBookingId: originalBooking.id,
            originalStartTime: originalBooking.startTime,
            newBookingId: created.booking.id,
            newStartTime: created.booking.startTime,
            reason: input.reason ?? null,
            recreatedAt: new Date().toISOString(),
          },
        });

        await tx.insert(bookingEvents).values({
          companyId: originalBooking.companyId,
          bookingId: created.booking.id,
          clientId: originalBooking.clientId,
          type: "booking.recreated_from_cancelled",
          actor: input.actor ?? "admin",
          payload: {
            sourceBookingId: originalBooking.id,
            sourceBookingStartTime: originalBooking.startTime,
            newBookingId: created.booking.id,
            newStartTime: created.booking.startTime,
            reason: input.reason ?? null,
            recreatedAt: new Date().toISOString(),
          },
        });
      });

      return {
        ok: true,
        originalBookingId: originalBooking.id,
        newBookingId: created.booking.id,
        startTime: created.booking.startTime,
        status: created.booking.status,
      };
    } catch (err) {
      console.error("BookingService.recreateById error:", err);

      return {
        ok: false,
        error: "internal_error",
        message: "Erro interno ao recriar booking.",
      };
    }
  }

  static async list(input: ListBookingsInput): Promise<ListBookingsResult> {
    const db = getDb();

    const normalizedStatus = input.status?.toUpperCase?.() ?? "ALL";
    const normalizedSearch = input.search?.trim() ?? "";

    const whereConditions: any[] = [];

    if (normalizedStatus !== "ALL") {
      whereConditions.push(eq(bookings.status, normalizedStatus));
    }

    if (normalizedSearch) {
      whereConditions.push(
        or(
          ilike(clients.name, `%${normalizedSearch}%`),
          ilike(clients.email, `%${normalizedSearch}%`),
          ilike(clients.phoneE164, `%${normalizedSearch}%`),
          ilike(bookings.notes, `%${normalizedSearch}%`),
        ),
      );
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const bookingRows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        startTime: bookings.startTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,

        clientName: clients.name,
        clientPhone: clients.phoneE164,
        clientEmail: clients.email,
      })
      .from(bookings)
      .leftJoin(clients, eq(clients.id, bookings.clientId))
      .where(whereClause)
      .orderBy(desc(bookings.startTime));

    const bookingIds = bookingRows.map((row) => row.id);

    const itemRows =
      bookingIds.length > 0
        ? await db
            .select({
              id: bookingItems.id,
              bookingId: bookingItems.bookingId,
              serviceId: bookingItems.serviceId,
              serviceName: services.name,
              durationMinutes: bookingItems.durationMinutes,
              createdAt: bookingItems.createdAt,
            })
            .from(bookingItems)
            .leftJoin(services, eq(services.id, bookingItems.serviceId))
            .where(inArray(bookingItems.bookingId, bookingIds))
            .orderBy(desc(bookingItems.createdAt))
        : [];

    const messageCountRows =
      bookingRows.length > 0
        ? await Promise.all(
            bookingRows.map(async (row) => {
              if (!row.clientPhone || !row.companyId) {
                return {
                  bookingId: row.id,
                  total: 0,
                };
              }

              const result = await db
                .select({
                  total: count(),
                })
                .from(messageLogs)
                .where(
                  and(
                    eq(messageLogs.companyId, row.companyId),
                    eq(messageLogs.toPhone, row.clientPhone),
                  ),
                );

              return {
                bookingId: row.id,
                total: Number(result[0]?.total ?? 0),
              };
            }),
          )
        : [];

    const itemsByBooking = new Map<
      string,
      Array<{
        id: string;
        bookingId: string;
        serviceId: string;
        serviceName: string | null;
        durationMinutes: number;
        createdAt: Date | null;
      }>
    >();

    for (const item of itemRows) {
      const list = itemsByBooking.get(item.bookingId) ?? [];
      list.push(item);
      itemsByBooking.set(item.bookingId, list);
    }

    const messageCountByBooking = new Map<string, number>();
    for (const row of messageCountRows) {
      messageCountByBooking.set(row.bookingId, row.total);
    }

    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;
    let completed = 0;
    let rescheduled = 0;

    for (const row of bookingRows) {
      const status = row.status?.toUpperCase?.() ?? "";

      if (status === "PENDING") pending += 1;
      if (status === "CONFIRMED") confirmed += 1;
      if (status === "CANCELLED") cancelled += 1;
      if (status === "COMPLETED") completed += 1;
      if (status === "RESCHEDULED") rescheduled += 1;
    }

    const bookingsList = bookingRows.map((row) => {
      const items = itemsByBooking.get(row.id) ?? [];
      const primaryItem = items[0] ?? null;

      return {
        id: row.id,
        companyId: row.companyId,
        clientId: row.clientId,
        startTime: row.startTime ? new Date(row.startTime).toISOString() : "",
        status: row.status ?? "PENDING",
        notes: row.notes ?? null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        client: {
          name: row.clientName ?? null,
          phone: row.clientPhone ?? null,
          email: row.clientEmail ?? null,
        },
        primaryItem: primaryItem
          ? {
              serviceId: primaryItem.serviceId,
              serviceName: primaryItem.serviceName ?? null,
              durationMinutes: primaryItem.durationMinutes,
            }
          : null,
        itemsCount: items.length,
        messageCount: messageCountByBooking.get(row.id) ?? 0,
      };
    });

    return {
      summary: {
        total: bookingRows.length,
        pending,
        confirmed,
        cancelled,
        completed,
        rescheduled,
      },
      bookings: bookingsList,
    };
  }
  static async listForAdmin(input: {
    companyId: string;
    search?: string;
    status?:
      | "ALL"
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "COMPLETED"
      | "RESCHEDULED";
  }) {
    const db = getDb();

    const normalizedSearch = input.search?.trim() ?? "";
    const normalizedStatus = input.status?.toUpperCase?.() ?? "ALL";

    const bookingsRows = await db
      .select({
        id: bookings.id,
        companyId: bookings.companyId,
        clientId: bookings.clientId,
        startTime: bookings.startTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,

        clientName: clients.name,
        clientPhone: clients.phoneE164,
        clientEmail: clients.email,
      })
      .from(bookings)
      .leftJoin(clients, eq(clients.id, bookings.clientId))
      .where(eq(bookings.companyId, input.companyId))
      .orderBy(desc(bookings.startTime));

    const filteredBookings = bookingsRows.filter((row) => {
      const matchesStatus =
        normalizedStatus === "ALL"
          ? true
          : (row.status?.toUpperCase?.() ?? "") === normalizedStatus;

      if (!matchesStatus) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        row.clientName ?? "",
        row.clientPhone ?? "",
        row.clientEmail ?? "",
        row.notes ?? "",
        row.status ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch.toLowerCase());
    });

    const bookingIds = filteredBookings.map((row) => row.id);

    const items =
      bookingIds.length > 0
        ? await db
            .select({
              id: bookingItems.id,
              bookingId: bookingItems.bookingId,
              serviceId: bookingItems.serviceId,
              serviceName: services.name,
              durationMinutes: bookingItems.durationMinutes,
              createdAt: bookingItems.createdAt,
            })
            .from(bookingItems)
            .leftJoin(services, eq(services.id, bookingItems.serviceId))
            .where(inArray(bookingItems.bookingId, bookingIds))
        : [];

    const messageCounts =
      bookingIds.length > 0
        ? await db
            .select({
              bookingId: bookingEvents.bookingId,
              total: count(),
            })
            .from(bookingEvents)
            .where(
              and(
                inArray(bookingEvents.bookingId, bookingIds),
                inArray(bookingEvents.type, [
                  "automation.precheckin.sent",
                  "automation.followup.sent",
                  "automation.reactivation.sent",
                ]),
              ),
            )
            .groupBy(bookingEvents.bookingId)
        : [];

    const logs =
      filteredBookings.length > 0
        ? await db
            .select({
              toPhone: messageLogs.toPhone,
              total: count(),
            })
            .from(messageLogs)
            .where(eq(messageLogs.companyId, input.companyId))
            .groupBy(messageLogs.toPhone)
        : [];

    const itemMap = new Map<string, typeof items>();
    for (const item of items) {
      const current = itemMap.get(item.bookingId) ?? [];
      current.push(item);
      itemMap.set(item.bookingId, current);
    }

    const logCountByPhone = new Map<string, number>();
    for (const log of logs) {
      if (log.toPhone) {
        logCountByPhone.set(log.toPhone, Number(log.total ?? 0));
      }
    }

    const bookingsList = filteredBookings.map((row) => {
      const bookingItemsList = itemMap.get(row.id) ?? [];
      const primaryItem = bookingItemsList[0] ?? null;
      const messageCount = row.clientPhone
        ? (logCountByPhone.get(row.clientPhone) ?? 0)
        : 0;

      return {
        id: row.id,
        companyId: row.companyId,
        clientId: row.clientId,
        startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
        status: row.status ?? "PENDING",
        notes: row.notes ?? null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        client: {
          name: row.clientName ?? null,
          phone: row.clientPhone ?? null,
          email: row.clientEmail ?? null,
        },
        primaryItem: primaryItem
          ? {
              serviceId: primaryItem.serviceId,
              serviceName: primaryItem.serviceName ?? null,
              durationMinutes: primaryItem.durationMinutes,
            }
          : null,
        itemsCount: bookingItemsList.length,
        messageCount,
      };
    });

    const summary = {
      total: bookingsList.length,
      pending: bookingsList.filter((b) => b.status === "PENDING").length,
      confirmed: bookingsList.filter((b) => b.status === "CONFIRMED").length,
      cancelled: bookingsList.filter((b) => b.status === "CANCELLED").length,
      completed: bookingsList.filter((b) => b.status === "COMPLETED").length,
      rescheduled: bookingsList.filter((b) => b.status === "RESCHEDULED")
        .length,
    };

    return {
      ok: true as const,
      summary,
      filters: {
        search: normalizedSearch,
        status: normalizedStatus,
      },
      bookings: bookingsList,
    };
  }
}
