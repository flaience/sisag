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
} from "@/drizzle/schema";
import { and, desc, eq, inArray, lt, gt, sql } from "drizzle-orm";

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
    };
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

    // 1) marca booking como CANCELLED
    await db
      .update(bookings)
      .set({ status: "CANCELLED", updatedAt: new Date() } as any)
      .where(eq(bookings.id, b.id));

    // 2) ✅ LIBERAR SLOT: remove allocations desse booking
    await db.execute(sql`
    delete from booking_item_allocations a
    using booking_items bi
    where a.booking_item_id = bi.id
      and bi.booking_id = ${b.id}::uuid;
  `);

    return {
      ok: true as const,
      bookingId: b.id,
      startTime: b.startTime,
    };
  }

  static async confirmById(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
  }) {
    const db = getDb();

    // ajuste os nomes/colunas conforme teu schema real (bookings.status etc)
    const rows = await db.execute(sql`
      update bookings
      set status = 'CONFIRMED', updated_at = now()
      where id = ${input.bookingId}::uuid
        and company_id = ${input.companyId}::uuid
        and client_id = ${input.clientId}::uuid
        and status in ('PENDING')
      returning id, start_time as "startTime";
    `);

    const r = (rows as any).rows?.[0];
    if (!r) return { ok: false as const, error: "not_found" as const };

    return { ok: true as const, bookingId: r.id, startTime: r.startTime };
  }

  static async cancelById(input: {
    companyId: string;
    clientId: string;
    bookingId: string;
  }) {
    const db = getDb();

    // ✅ recomendo transação aqui também (update + delete)
    return await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        update bookings
        set status = 'CANCELLED', updated_at = now()
        where id = ${input.bookingId}::uuid
          and company_id = ${input.companyId}::uuid
          and client_id = ${input.clientId}::uuid
          and status in ('PENDING','CONFIRMED')
        returning id, start_time as "startTime";
      `);

      const r = (rows as any).rows?.[0];
      if (!r)
        return { ok: false as const, error: "not_found_or_not_cancellable" };

      // ✅ LIBERAR SLOT: remove allocations desse booking
      await tx.execute(sql`
        delete from booking_item_allocations a
        using booking_items bi
        where a.booking_item_id = bi.id
          and bi.booking_id = ${input.bookingId}::uuid;
      `);

      return { ok: true as const, bookingId: r.id, startTime: r.startTime };
    });
  }
}
