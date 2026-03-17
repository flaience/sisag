//src/modules/bookings/Booking.service.ts
import { getDb } from "@/lib/db";
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
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";

/* =====================================================
   TYPES
===================================================== */
type Ok<T extends object> = { ok: true } & T;
type Err<E extends string> = { ok: false; error: E; message?: string };

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

type RescheduleByIdInput = {
  bookingId: string;
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

/* =====================================================
   HELPERS - JOURNEY / EXPERIENCE
===================================================== */
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
        .where(eq(bookings.id, input.bookingId))
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
          .where(eq(bookings.id, input.bookingId));

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

  static async getJourney(bookingId: string) {
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
      .where(eq(bookings.id, bookingId))
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
}
