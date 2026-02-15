// src/modules/appointments/Appointment.service.integration.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// 0) Mock DB (transaction)
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    transaction: async (fn: any) => {
      const tx = { __tx: true };
      return await fn(tx);
    },
  })),
}));

// 1) Mock scheduling engine (validateSchedulingRules)
vi.mock("@/modules/schedules/Schedule.model", () => ({
  validateSchedulingRules: vi.fn(),
}));

// 2) Mock outbox insert
vi.mock("@/modules/outbox/outbox.repository", () => ({
  outboxInsert: vi.fn(),
}));

// 3) Mock repositories usados pelo create()
vi.mock("@/modules/professionals/Professional.repository", () => ({
  ProfessionalRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/modules/people/People.repository", () => ({
  PeopleRepository: {
    findById: vi.fn(),
  },
}));

// 4) Mock AppointmentRepository (Tx)
vi.mock("@/modules/appointments/Appointment.repository", () => ({
  AppointmentRepository: {
    createTx: vi.fn(),
    updateTx: vi.fn(),
    findById: vi.fn(),
  },
}));

// 5) Mock locks para reschedule/cancel não bater no DB real
vi.mock("@/lib/locks", () => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { validateSchedulingRules } from "@/modules/schedules/Schedule.model";
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";
import { PeopleRepository } from "@/modules/people/People.repository";
import { AppointmentRepository } from "@/modules/appointments/Appointment.repository";
import { AppointmentService } from "@/modules/appointments/Appointment.service";

describe("AppointmentService integration-light (no DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create() calls validateSchedulingRules and blocks when validation fails", async () => {
    (ProfessionalRepository.findById as any).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      name: "Dr. Test",
    });

    (PeopleRepository.findById as any).mockResolvedValue({
      id: "cl1",
      name: "Client",
      phoneE164: "+5551999999999",
    });

    (validateSchedulingRules as any).mockResolvedValue({
      ok: false,
      error: "not_on_grid",
      message: "Horário inválido.",
    });

    const res = await AppointmentService.create({
      professionalId: "p1",
      clientId: "cl1",
      scheduledTime: "2026-02-16T13:07:00.000Z",
    });

    expect(validateSchedulingRules).toHaveBeenCalledTimes(1);
    expect(validateSchedulingRules).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "c1",
        professionalId: "p1",
        scheduledTimeUtcIso: "2026-02-16T13:07:00.000Z",
      }),
    );

    // ✅ sem transação e sem insert
    expect(getDb).toHaveBeenCalledTimes(0);
    expect(AppointmentRepository.createTx).not.toHaveBeenCalled();
    expect(outboxInsert).not.toHaveBeenCalled();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("not_on_grid");
  });

  it("create() calls repository when validation passes (and inserts outbox)", async () => {
    (ProfessionalRepository.findById as any).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      name: "Dr. Test",
    });

    (PeopleRepository.findById as any).mockResolvedValue({
      id: "cl1",
      name: "Client",
      phoneE164: "+5551999999999",
    });

    (validateSchedulingRules as any).mockResolvedValue({ ok: true });

    (AppointmentRepository.createTx as any).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      professionalId: "p1",
      clientId: "cl1",
      status: "CONFIRMED",
      scheduledTime: new Date("2026-02-16T13:00:00.000Z"),
    });

    const res = await AppointmentService.create({
      professionalId: "p1",
      clientId: "cl1",
      scheduledTime: "2026-02-16T13:00:00.000Z",
    });

    expect(validateSchedulingRules).toHaveBeenCalledTimes(1);
    expect(getDb).toHaveBeenCalledTimes(1);
    expect(AppointmentRepository.createTx).toHaveBeenCalledTimes(1);

    // outboxInsert deve ter sido chamado dentro da transação com tx como 2º arg
    expect(outboxInsert).toHaveBeenCalledTimes(1);
    const call = (outboxInsert as any).mock.calls[0];
    expect(call[0]).toEqual(
      expect.objectContaining({
        aggregateType: "appointment",
        aggregateId: "a1",
        eventType: "appointment.created",
        payload: expect.objectContaining({
          companyId: "c1",
        }),
      }),
    );
    expect(call[1]).toEqual(expect.objectContaining({ __tx: true }));

    expect(res.ok).toBe(true);
  });

  it("create() returns slot_taken when DB throws 23505 for appointments_unique_active_slot", async () => {
    (ProfessionalRepository.findById as any).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      name: "Dr. Test",
    });

    (PeopleRepository.findById as any).mockResolvedValue({
      id: "cl1",
      name: "Client",
      phoneE164: "+5551999999999",
    });

    (validateSchedulingRules as any).mockResolvedValue({ ok: true });

    (AppointmentRepository.createTx as any).mockRejectedValue({
      code: "23505",
      constraint: "appointments_unique_active_slot",
      message: "duplicate key value violates unique constraint",
    });

    const res = await AppointmentService.create({
      professionalId: "p1",
      clientId: "cl1",
      scheduledTime: "2026-02-16T13:00:00.000Z",
    });

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("slot_taken");
    }
    expect(outboxInsert).not.toHaveBeenCalled();
  });

  it("reschedule() passes appointmentIdToIgnore to validateSchedulingRules", async () => {
    (AppointmentRepository.findById as any).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      professionalId: "p1",
      clientId: "cl1",
      status: "CONFIRMED",
      scheduledTime: new Date("2026-02-16T13:00:00.000Z"),
    });

    (validateSchedulingRules as any).mockResolvedValue({ ok: true });

    (AppointmentRepository.updateTx as any).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      scheduledTime: new Date("2026-02-16T13:15:00.000Z"),
    });

    const res = await AppointmentService.reschedule(
      "a1",
      "2026-02-16T13:15:00.000Z",
    );

    expect(validateSchedulingRules).toHaveBeenCalledTimes(1);
    expect(validateSchedulingRules).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "c1",
        professionalId: "p1",
        scheduledTimeUtcIso: "2026-02-16T13:15:00.000Z",
        appointmentIdToIgnore: "a1",
      }),
    );

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(AppointmentRepository.updateTx).toHaveBeenCalledTimes(1);
    expect(outboxInsert).toHaveBeenCalledTimes(1);

    expect(res.ok).toBe(true);
  });

  it("reschedule() blocks when validation fails and does NOT update", async () => {
    (AppointmentRepository.findById as any).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      professionalId: "p1",
      clientId: "cl1",
      status: "CONFIRMED",
      scheduledTime: new Date("2026-02-16T13:00:00.000Z"),
    });

    (validateSchedulingRules as any).mockResolvedValue({
      ok: false,
      error: "slot_taken",
      message: "Horário já reservado.",
    });

    const res = await AppointmentService.reschedule(
      "a1",
      "2026-02-16T13:00:00.000Z",
    );

    expect(getDb).toHaveBeenCalledTimes(0);
    expect(AppointmentRepository.updateTx).not.toHaveBeenCalled();
    expect(outboxInsert).not.toHaveBeenCalled();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("slot_taken");
  });

  it("reschedule() returns slot_taken when DB throws 23505 for appointments_unique_active_slot", async () => {
    (AppointmentRepository.findById as any).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      professionalId: "p1",
      clientId: "cl1",
      status: "CONFIRMED",
      scheduledTime: new Date("2026-02-16T13:00:00.000Z"),
    });

    (validateSchedulingRules as any).mockResolvedValue({ ok: true });

    (AppointmentRepository.updateTx as any).mockRejectedValue({
      code: "23505",
      constraint: "appointments_unique_active_slot",
      message: "duplicate key value violates unique constraint",
    });

    const res = await AppointmentService.reschedule(
      "a1",
      "2026-02-16T13:15:00.000Z",
    );

    expect(getDb).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("slot_taken");
    }
    expect(outboxInsert).not.toHaveBeenCalled();
  });
});
