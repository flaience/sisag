//src/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SisagSchedulingAdapter } from "./sisag-scheduling-adapter";
import { BookingCoreService } from "@/modules/bookings/Booking.core";
import { AvailabilityService } from "@/modules/availability/Availability.service";
import { getDb } from "@/lib/db";

vi.mock("@/modules/bookings/Booking.core", () => ({
  BookingCoreService: {
    createAuto: vi.fn(),
    confirmById: vi.fn(),
    cancelById: vi.fn(),
    rescheduleById: vi.fn(),
    completeById: vi.fn(),
  },
}));

vi.mock("@/modules/availability/Availability.service", () => ({
  AvailabilityService: {
    listSlots: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/drizzle/schema", () => ({
  bookingItemAllocations: { id: "bid", resourceId: "br", bookingItemId: "bbi" },
  bookingItems: {
    id: "biid",
    serviceId: "bs",
    startTime: "bst",
    endTime: "bet",
    durationMinutes: "bdm",
    bookingId: "bbid",
  },
  bookings: {
    id: "boid",
    companyId: "bcid",
    clientId: "bcid2",
    startTime: "bst2",
    status: "bstatus",
  },
  professionals: { id: "pid", resourceId: "prid", companyId: "pcid" },
  services: { durationMinutes: "sdm", companyId: "scid", id: "sid" },
}));

/* ================================================================
   HELPER: mock do Drizzle que funciona tanto com .limit(1) quanto
   com .where() sozinho (sem .limit).
   Cada chamada a .where() consome o próximo resultado do array.
   ================================================================ */
function mockDb(results: any[][]) {
  let index = 0;
  const next = () => {
    const value = results[index++] ?? [];
    const promise = Promise.resolve(value);
    return Object.assign(promise, { limit: () => promise });
  };
  return {
    select: () => ({ from: () => ({ where: next }) }),
  };
}

describe("SisagSchedulingAdapter", () => {
  let adapter: SisagSchedulingAdapter;
  const context = {
    companyId: "comp-123",
    actor: { type: "user" as const, id: "user-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SisagSchedulingAdapter();
  });

  describe("findAvailableSlots", () => {
    it("scans the full interval and limits returned slots", async () => {
      vi.mocked(AvailabilityService.listSlots).mockResolvedValue({
        ok: true,
        slots: [
          {
            startTime: "2026-08-05T10:00:00.000Z",
            endTime: "2026-08-05T10:30:00.000Z",
            resourceIds: ["resource-1"],
          },
          {
            startTime: "2026-08-05T10:30:00.000Z",
            endTime: "2026-08-05T11:00:00.000Z",
            resourceIds: ["resource-1"],
          },
          {
            startTime: "2026-08-05T11:00:00.000Z",
            endTime: "2026-08-05T11:30:00.000Z",
            resourceIds: ["resource-1"],
          },
        ],
      });

      const result = await adapter.findAvailableSlots(context, {
        serviceId: "service-1",
        dateFrom: "2026-08-05T00:00:00.000Z",
        dateTo: "2026-08-06T00:00:00.000Z",
        limit: 2,
      });

      // 24 hours / 15-minute steps: scan 96 candidates, return at most 2.
      expect(AvailabilityService.listSlots).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 96 }),
      );
      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.map((slot) => slot.startsAt)).toEqual([
        "2026-08-05T10:00:00.000Z",
        "2026-08-05T10:30:00.000Z",
      ]);
    });
  });

  describe("createAppointment", () => {
    it("rejects an invalid appointment interval", async () => {
      const result = await adapter.createAppointment(context, {
        clientId: "client-1",
        serviceId: "svc-1",
        startsAt: "invalid",
        endsAt: "2026-08-01T10:30:00.000Z",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("rejects explicit resource selection", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([[{ durationMinutes: 30 }]]) as any,
      );

      const result = await adapter.createAppointment(context, {
        clientId: "client-1",
        serviceId: "svc-1",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
        resourceIds: ["res-1"],
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("rejects an end time that differs from service duration", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([[{ durationMinutes: 60 }]]) as any,
      );

      const result = await adapter.createAppointment(context, {
        clientId: "client-1",
        serviceId: "svc-1",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("maps slot_taken to scheduling slot unavailable", async () => {
      vi.mocked(BookingCoreService.createAuto).mockResolvedValue({
        ok: false,
        error: "slot_taken",
      });
      vi.mocked(getDb).mockReturnValue(
        mockDb([[{ durationMinutes: 30 }]]) as any,
      );

      const result = await adapter.createAppointment(context, {
        clientId: "client-1",
        serviceId: "svc-1",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_SLOT_NOT_AVAILABLE");
    });

    it("creates and translates a booking into AppointmentSummary", async () => {
      vi.mocked(BookingCoreService.createAuto).mockResolvedValue({
        ok: true,
        booking: {
          id: "booking-1",
          companyId: "comp-123",
          clientId: "client-1",
          startTime: "2026-08-01T10:00:00.000Z",
          status: "PENDING",
        },
      });

      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{ durationMinutes: 30 }],
          [
            {
              id: "item-1",
              serviceId: "svc-1",
              startTime: "2026-08-01T10:00:00.000Z",
              endTime: "2026-08-01T10:30:00.000Z",
            },
          ],
          [],
        ]) as any,
      );

      const result = await adapter.createAppointment(context, {
        clientId: "client-1",
        serviceId: "svc-1",
        startsAt: "2026-08-01T10:00:00.000Z",
        endsAt: "2026-08-01T10:30:00.000Z",
      });

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({ id: "booking-1", state: "pending" });
      expect(result.emittedEvents).toContain("appointment.created");
    });
  });

  describe("confirmAppointment", () => {
    it("rejects missing companyId", async () => {
      const result = await adapter.confirmAppointment(
        { ...context, companyId: "" },
        { appointmentId: "appt-1" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("rejects missing appointmentId", async () => {
      const result = await adapter.confirmAppointment(context, {
        appointmentId: "",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("returns not found when booking does not exist", async () => {
      vi.mocked(getDb).mockReturnValue(mockDb([[]]) as any);

      const result = await adapter.confirmAppointment(context, {
        appointmentId: "00000000-0000-0000-0000-000000000000",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_APPOINTMENT_NOT_FOUND");
    });

    it("rejects confirmation of non-pending appointments", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [
            {
              id: "booking-1",
              companyId: "comp-123",
              clientId: "client-1",
              startTime: "2026-08-01T10:00:00.000Z",
              status: "CONFIRMED",
            },
          ],
        ]) as any,
      );

      const result = await adapter.confirmAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });

    it("confirms a pending appointment successfully", async () => {
      vi.mocked(BookingCoreService.confirmById).mockResolvedValue({
        ok: true,
        bookingId: "booking-1",
        startTime: "2026-08-01T10:00:00.000Z",
      });

      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [
            {
              id: "booking-1",
              companyId: "comp-123",
              clientId: "client-1",
              startTime: "2026-08-01T10:00:00.000Z",
              status: "PENDING",
            },
          ],
          [
            {
              id: "item-1",
              serviceId: "svc-1",
              startTime: "2026-08-01T10:00:00.000Z",
              endTime: "2026-08-01T10:30:00.000Z",
            },
          ],
          [],
        ]) as any,
      );

      const result = await adapter.confirmAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        id: "booking-1",
        state: "confirmed",
      });
      expect(result.emittedEvents).toContain("appointment.confirmed");
      expect(BookingCoreService.confirmById).toHaveBeenCalledWith({
        companyId: "comp-123",
        clientId: "client-1",
        bookingId: "booking-1",
        actor: "admin",
      });
    });
  });

  describe("cancelAppointment", () => {
    it("rejects missing companyId or appointmentId", async () => {
      const missingCompany = await adapter.cancelAppointment(
        { ...context, companyId: "" },
        { appointmentId: "booking-1" },
      );
      const missingAppointment = await adapter.cancelAppointment(context, {
        appointmentId: "",
      });

      expect(missingCompany.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(missingAppointment.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(BookingCoreService.cancelById).not.toHaveBeenCalled();
    });

    it("returns not found outside the company context", async () => {
      vi.mocked(getDb).mockReturnValue(mockDb([[]]) as any);
      const result = await adapter.cancelAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.error?.code).toBe("SCHEDULING_APPOINTMENT_NOT_FOUND");
      expect(BookingCoreService.cancelById).not.toHaveBeenCalled();
    });

    it("rejects appointments that are not pending or confirmed", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([[
          {
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CANCELLED",
          },
        ]]) as any,
      );

      const result = await adapter.cancelAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(BookingCoreService.cancelById).not.toHaveBeenCalled();
    });

    it.each(["PENDING", "CONFIRMED"])(
      "cancels a %s appointment and preserves its summary",
      async (status) => {
        vi.mocked(BookingCoreService.cancelById).mockResolvedValue({
          ok: true,
          bookingId: "booking-1",
          startTime: "2026-08-01T10:00:00.000Z",
        });
        vi.mocked(getDb).mockReturnValue(
          mockDb([
            [{
              id: "booking-1",
              companyId: "comp-123",
              clientId: "client-1",
              status,
            }],
            [{
              id: "item-1",
              serviceId: "svc-1",
              startTime: "2026-08-01T10:00:00.000Z",
              endTime: "2026-08-01T10:30:00.000Z",
            }],
            [{ resourceId: "resource-1" }],
          ]) as any,
        );

        const result = await adapter.cancelAppointment(context, {
          appointmentId: "booking-1",
          reason: "Cliente solicitou",
        });

        expect(result).toEqual({
          ok: true,
          data: {
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            professionalId: null,
            serviceId: "svc-1",
            resourceIds: ["resource-1"],
            startsAt: "2026-08-01T10:00:00.000Z",
            endsAt: "2026-08-01T10:30:00.000Z",
            state: "cancelled",
          },
          emittedEvents: ["appointment.cancelled"],
        });
        expect(BookingCoreService.cancelById).toHaveBeenCalledWith({
          companyId: "comp-123",
          clientId: "client-1",
          bookingId: "booking-1",
          actor: "admin",
          reason: "Cliente solicitou",
        });
      },
    );

    it("maps a concurrent cancellation failure", async () => {
      vi.mocked(BookingCoreService.cancelById).mockResolvedValue({
        ok: false,
        error: "not_found_or_not_cancellable",
      });
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "PENDING",
          }],
          [{
            id: "item-1",
            serviceId: "svc-1",
            startTime: "2026-08-01T10:00:00.000Z",
            endTime: "2026-08-01T10:30:00.000Z",
          }],
          [],
        ]) as any,
      );

      const result = await adapter.cancelAppointment(context, {
        appointmentId: "booking-1",
      });
      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });
  });

  describe("rescheduleAppointment", () => {
    const input = {
      appointmentId: "booking-1",
      startsAt: "2026-08-05T10:00:00.000Z",
      endsAt: "2026-08-05T10:30:00.000Z",
      reason: "Cliente solicitou",
    };

    it("rejects an invalid interval", async () => {
      const result = await adapter.rescheduleAppointment(context, {
        ...input,
        endsAt: "2026-08-05T09:30:00.000Z",
      });

      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(BookingCoreService.rescheduleById).not.toHaveBeenCalled();
    });

    it("rejects an end time incompatible with the booked duration", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CONFIRMED",
          }],
          [{ id: "item-1", serviceId: "svc-1", durationMinutes: 30 }],
        ]) as any,
      );

      const result = await adapter.rescheduleAppointment(context, {
        ...input,
        endsAt: "2026-08-05T11:00:00.000Z",
      });

      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(BookingCoreService.rescheduleById).not.toHaveBeenCalled();
    });

    it("maps slot_taken to scheduling slot unavailable", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CONFIRMED",
          }],
          [{ id: "item-1", serviceId: "svc-1", durationMinutes: 30 }],
        ]) as any,
      );
      vi.mocked(BookingCoreService.rescheduleById).mockResolvedValue({
        ok: false,
        error: "slot_taken",
      });

      const result = await adapter.rescheduleAppointment(context, input);
      expect(result.error?.code).toBe("SCHEDULING_SLOT_NOT_AVAILABLE");
    });

    it("reschedules while preserving the confirmed lifecycle state", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CONFIRMED",
          }],
          [{ id: "item-1", serviceId: "svc-1", durationMinutes: 30 }],
        ]) as any,
      );
      vi.mocked(BookingCoreService.rescheduleById).mockResolvedValue({
        ok: true,
        bookingId: "booking-1",
        companyId: "comp-123",
        clientId: "client-1",
        serviceId: "svc-1",
        resourceIds: ["resource-1"],
        oldStartTime: "2026-08-01T10:00:00.000Z",
        newStartTime: input.startsAt,
        newEndTime: input.endsAt,
        status: "CONFIRMED",
      });

      const result = await adapter.rescheduleAppointment(context, input);

      expect(result).toMatchObject({
        ok: true,
        data: {
          id: "booking-1",
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          state: "confirmed",
        },
        emittedEvents: ["appointment.rescheduled"],
      });
      expect(BookingCoreService.rescheduleById).toHaveBeenCalledWith({
        companyId: "comp-123",
        bookingId: "booking-1",
        newStartTime: input.startsAt,
        actor: "admin",
        reason: "Cliente solicitou",
      });
    });
  });

  describe("completeAppointment", () => {
    it("rejects missing companyId or appointmentId", async () => {
      const missingCompany = await adapter.completeAppointment(
        { ...context, companyId: "" },
        { appointmentId: "booking-1" },
      );
      const missingAppointment = await adapter.completeAppointment(context, {
        appointmentId: "",
      });

      expect(missingCompany.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(missingAppointment.error?.code).toBe(
        "SCHEDULING_OPERATION_NOT_ALLOWED",
      );
      expect(BookingCoreService.completeById).not.toHaveBeenCalled();
    });

    it("returns not found outside the company context", async () => {
      vi.mocked(getDb).mockReturnValue(mockDb([[]]) as any);

      const result = await adapter.completeAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.error?.code).toBe("SCHEDULING_APPOINTMENT_NOT_FOUND");
      expect(BookingCoreService.completeById).not.toHaveBeenCalled();
    });

    it("rejects appointments that are not confirmed", async () => {
      vi.mocked(getDb).mockReturnValue(
        mockDb([[
          {
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "PENDING",
          },
        ]]) as any,
      );

      const result = await adapter.completeAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
      expect(BookingCoreService.completeById).not.toHaveBeenCalled();
    });

    it("completes a confirmed appointment and preserves its summary", async () => {
      vi.mocked(BookingCoreService.completeById).mockResolvedValue({
        ok: true,
        bookingId: "booking-1",
        startTime: "2026-08-01T10:00:00.000Z",
        completedAt: "2026-08-01T11:00:00.000Z",
      });
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CONFIRMED",
          }],
          [{
            id: "item-1",
            serviceId: "svc-1",
            startTime: "2026-08-01T10:00:00.000Z",
            endTime: "2026-08-01T10:30:00.000Z",
          }],
          [{ resourceId: "resource-1" }],
        ]) as any,
      );

      const result = await adapter.completeAppointment(context, {
        appointmentId: "booking-1",
        notes: "  Serviço realizado  ",
      });

      expect(result).toMatchObject({
        ok: true,
        data: {
          id: "booking-1",
          state: "completed",
          resourceIds: ["resource-1"],
        },
        emittedEvents: ["appointment.completed"],
      });
      expect(BookingCoreService.completeById).toHaveBeenCalledWith({
        companyId: "comp-123",
        clientId: "client-1",
        bookingId: "booking-1",
        actor: "admin",
        notes: "Serviço realizado",
      });
    });

    it("maps a concurrent completion failure", async () => {
      vi.mocked(BookingCoreService.completeById).mockResolvedValue({
        ok: false,
        error: "not_found_or_not_completable",
      });
      vi.mocked(getDb).mockReturnValue(
        mockDb([
          [{
            id: "booking-1",
            companyId: "comp-123",
            clientId: "client-1",
            status: "CONFIRMED",
          }],
          [{
            id: "item-1",
            serviceId: "svc-1",
            startTime: "2026-08-01T10:00:00.000Z",
            endTime: "2026-08-01T10:30:00.000Z",
          }],
          [],
        ]) as any,
      );

      const result = await adapter.completeAppointment(context, {
        appointmentId: "booking-1",
      });

      expect(result.error?.code).toBe("SCHEDULING_OPERATION_NOT_ALLOWED");
    });
  });
});
