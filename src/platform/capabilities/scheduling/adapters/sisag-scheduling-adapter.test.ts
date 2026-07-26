import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/modules/bookings/Booking.service", () => ({
  BookingService: {
    createAuto: vi.fn(),
  },
}));

import { getDb } from "@/lib/db";
import { BookingService } from "@/modules/bookings/Booking.service";
import { SisagSchedulingAdapter } from "./sisag-scheduling-adapter";

const context = {
  companyId: "company-1",
  actor: {
    type: "api" as const,
    id: "api-test",
  },
};

const validInput = {
  clientId: "client-1",
  professionalId: "professional-1",
  serviceId: "service-1",
  startsAt: "2026-08-03T13:00:00.000Z",
  endsAt: "2026-08-03T13:30:00.000Z",
  notes: "Teste da Scheduling Capability",
};

type DbMockOptions = {
  durationMinutes?: number;
  item?: {
    id: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
  };
  allocations?: Array<{
    resourceId: string;
  }>;
};

function makeDbMock(options: DbMockOptions = {}) {
  const {
    durationMinutes = 30,
    item = {
      id: "booking-item-1",
      serviceId: "service-1",
      startTime: new Date("2026-08-03T13:00:00.000Z"),
      endTime: new Date("2026-08-03T13:30:00.000Z"),
    },
    allocations = [
      {
        resourceId: "resource-1",
      },
    ],
  } = options;

  const serviceQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  serviceQuery.from.mockReturnValue(serviceQuery);
  serviceQuery.where.mockReturnValue(serviceQuery);
  serviceQuery.limit.mockResolvedValue([
    {
      durationMinutes,
    },
  ]);

  const itemQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  itemQuery.from.mockReturnValue(itemQuery);
  itemQuery.where.mockReturnValue(itemQuery);
  itemQuery.limit.mockResolvedValue([item]);

  const allocationQuery = {
    from: vi.fn(),
    where: vi.fn(),
  };

  allocationQuery.from.mockReturnValue(allocationQuery);
  allocationQuery.where.mockResolvedValue(allocations);

  const db = {
    select: vi
      .fn()
      .mockReturnValueOnce(serviceQuery)
      .mockReturnValueOnce(itemQuery)
      .mockReturnValueOnce(allocationQuery),
  };

  return {
    db,
    serviceQuery,
    itemQuery,
    allocationQuery,
  };
}

describe("SisagSchedulingAdapter.createAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReset();
    vi.mocked(BookingService.createAuto).mockReset();
  });

  it("rejects an invalid appointment interval", async () => {
    const adapter = new SisagSchedulingAdapter();

    const result = await adapter.createAppointment(context, {
      ...validInput,
      endsAt: "2026-08-03T12:30:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SCHEDULING_OPERATION_NOT_ALLOWED",
        message: "O intervalo informado para o agendamento é inválido.",
      },
    });

    expect(getDb).not.toHaveBeenCalled();
    expect(BookingService.createAuto).not.toHaveBeenCalled();
  });

  it("rejects explicit resource selection", async () => {
    const adapter = new SisagSchedulingAdapter();

    const result = await adapter.createAppointment(context, {
      ...validInput,
      resourceIds: ["resource-1"],
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SCHEDULING_OPERATION_NOT_ALLOWED",
        message:
          "A seleção explícita de recursos ainda não é suportada por esta implementação.",
      },
    });

    expect(getDb).not.toHaveBeenCalled();
    expect(BookingService.createAuto).not.toHaveBeenCalled();
  });

  it("rejects an end time that differs from service duration", async () => {
    const { db } = makeDbMock({
      durationMinutes: 30,
    });

    vi.mocked(getDb).mockReturnValue(db as never);

    const adapter = new SisagSchedulingAdapter();

    const result = await adapter.createAppointment(context, {
      ...validInput,
      endsAt: "2026-08-03T14:00:00.000Z",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SCHEDULING_OPERATION_NOT_ALLOWED",
        message:
          "O horário final informado não corresponde à duração configurada para o serviço.",
      },
    });

    expect(BookingService.createAuto).not.toHaveBeenCalled();
  });

  it("maps slot_taken to scheduling slot unavailable", async () => {
    const { db } = makeDbMock();

    vi.mocked(getDb).mockReturnValue(db as never);

    vi.mocked(BookingService.createAuto).mockResolvedValue({
      ok: false,
      error: "slot_taken",
    });

    const adapter = new SisagSchedulingAdapter();
    const result = await adapter.createAppointment(context, validInput);

    expect(BookingService.createAuto).toHaveBeenCalledWith({
      companyId: "company-1",
      clientId: "client-1",
      professionalId: "professional-1",
      serviceId: "service-1",
      startTime: "2026-08-03T13:00:00.000Z",
      notes: "Teste da Scheduling Capability",
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SCHEDULING_SLOT_NOT_AVAILABLE",
        message: "O horário solicitado não está mais disponível.",
      },
    });
  });

  it("creates and translates a booking into AppointmentSummary", async () => {
    const { db } = makeDbMock({
      allocations: [
        {
          resourceId: "resource-1",
        },
        {
          resourceId: "resource-2",
        },
      ],
    });

    vi.mocked(getDb).mockReturnValue(db as never);

    vi.mocked(BookingService.createAuto).mockResolvedValue({
      ok: true,
      booking: {
        id: "booking-1",
        companyId: "company-1",
        clientId: "client-1",
        startTime: "2026-08-03T13:00:00.000Z",
        status: "PENDING",
      },
    });

    const adapter = new SisagSchedulingAdapter();
    const result = await adapter.createAppointment(context, validInput);

    expect(result).toEqual({
      ok: true,
      data: {
        id: "booking-1",
        companyId: "company-1",
        clientId: "client-1",
        professionalId: "professional-1",
        serviceId: "service-1",
        resourceIds: ["resource-1", "resource-2"],
        startsAt: "2026-08-03T13:00:00.000Z",
        endsAt: "2026-08-03T13:30:00.000Z",
        state: "pending",
      },
      emittedEvents: ["appointment.created"],
    });
  });
});
