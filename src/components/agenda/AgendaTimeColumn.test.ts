import { describe, expect, it } from "vitest";
import { agendaTimeLabelToMinutes, positionAppointments } from "./AgendaTimeColumn";

describe("AgendaTimeColumn timezone-independent positioning", () => {
  it("converts the São Paulo label to minutes without reading the browser timezone", () => {
    expect(agendaTimeLabelToMinutes("11:00")).toBe(660);
    expect(agendaTimeLabelToMinutes("14:30")).toBe(870);
  });

  it("positions the real 14:00 UTC booking in the 11:00 local range", () => {
    const result = positionAppointments(
      [{
        id: "booking-real",
        scheduledTime: "2026-10-05T14:00:00.000Z",
        endTime: "2026-10-05T14:30:00.000Z",
        timeLabel: "11:00",
        status: "PENDING",
        clientName: "Cliente Teste",
        professionalId: "professional-1",
        professionalName: "Profissional Teste",
        durationMinutes: 30,
        serviceNameSnapshot: "Consulta",
      }],
      [{ label: "07:00", hour: 7, minute: 0, minutesOfDay: 420 }],
      72,
    );

    expect(result[0]).toMatchObject({
      minutesOfDay: 660,
      top: 576,
      height: 72,
    });
  });
});
