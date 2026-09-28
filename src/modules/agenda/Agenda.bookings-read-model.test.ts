import { describe, expect, it } from "vitest";

import { composeAgendaBookingItems, getAgendaDayRange } from "./Agenda.service";

describe("agenda official bookings read model", () => {
  it("maps an official booking allocation to the existing agenda card contract", () => {
    const result = composeAgendaBookingItems(
      [{ id: "booking-1", startTime: "2026-10-05T13:00:00.000Z", status: "PENDING", clientName: "Cliente Teste" }],
      [{ bookingId: "booking-1", endTime: "2026-10-05T13:30:00.000Z", serviceName: "Consulta", professionalId: "professional-1", professionalName: "Profissional Teste" }],
    );
    expect(result).toMatchObject([{
      id: "booking-1",
      scheduledTime: "2026-10-05T13:00:00.000Z",
      endTime: "2026-10-05T13:30:00.000Z",
      status: "PENDING",
      clientName: "Cliente Teste",
      professionalId: "professional-1",
      professionalName: "Profissional Teste",
      durationMinutes: 30,
      serviceNameSnapshot: "Consulta",
    }]);
  });

  it("does not duplicate a booking with multiple detail rows", () => {
    const result = composeAgendaBookingItems(
      [{ id: "booking-1", startTime: "2026-10-05T13:00:00.000Z", status: "PENDING", clientName: null }],
      [
        { bookingId: "booking-1", endTime: "2026-10-05T13:30:00.000Z", serviceName: "Consulta", professionalId: null, professionalName: null },
        { bookingId: "booking-1", endTime: "2026-10-05T13:30:00.000Z", serviceName: "Consulta", professionalId: "professional-1", professionalName: "Profissional Teste" },
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ clientName: "Cliente não identificado", professionalId: "professional-1" });
  });

  it("queries a São Paulo calendar day as the correct UTC interval", () => {
    const range = getAgendaDayRange("2026-10-05");
    expect(range.start.toISOString()).toBe("2026-10-05T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-06T03:00:00.000Z");
  });
});
