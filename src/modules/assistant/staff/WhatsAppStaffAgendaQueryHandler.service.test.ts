import { describe, expect, it } from "vitest";
import { composeStaffAgendaReply } from "./WhatsAppStaffAgendaQueryHandler.service";

const appointment = {
  bookingId: "booking-1",
  startTime: "2026-09-29T17:00:00.000Z",
  endTime: "2026-09-29T17:30:00.000Z",
  timeLabel: "29/09/2026, 14:00",
  clientName: "Cliente Teste",
  serviceName: "Consulta",
  professionalId: "professional-1",
  professionalName: "Profissional Teste",
  status: "CONFIRMED",
};

describe("WhatsApp staff agenda query handler", () => {
  it("composes an empty afternoon response", () => {
    expect(composeStaffAgendaReply({ kind: "day_agenda", period: "afternoon", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [] }, "professional"))
      .toBe("Não há atendimentos na sua agenda da tarde.");
  });

  it("shows the next appointment without redundant professional name", () => {
    const reply = composeStaffAgendaReply({ kind: "next_appointment", period: null, timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [appointment] }, "professional");
    expect(reply).toContain("Cliente: Cliente Teste");
    expect(reply).not.toContain("Profissional Teste");
  });

  it("names the resolved professional in an empty filtered agenda", () => {
    const reply = composeStaffAgendaReply({ kind: "day_agenda", period: "full_day", day: "tomorrow", targetProfessionalName: "Profissional Teste", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [] }, "manager");
    expect(reply).toBe("Não há atendimentos na agenda de Profissional Teste de amanhã.");
  });

  it("names the resolved professional in an aggregate count", () => {
    const reply = composeStaffAgendaReply({ kind: "day_summary", period: "full_day", day: "tomorrow", targetProfessionalName: "Profissional Teste", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [], totalCount: 2 }, "manager");
    expect(reply).toBe("Há 2 atendimentos na agenda de Profissional Teste de amanhã.");
  });

  it("shows the professional to an authorized manager", () => {
    const reply = composeStaffAgendaReply({ kind: "next_appointment", period: null, timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [appointment] }, "manager");
    expect(reply).toContain("👤 Profissional Teste");
  });
});
