import { describe, expect, it } from "vitest";
import { interpretStaffAgendaQuery } from "./WhatsAppStaffAgendaQuery";

describe("WhatsApp staff agenda query", () => {
  it("recognizes the production phrase for the afternoon agenda", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda da tarde?")).toEqual({ kind: "day_agenda", period: "afternoon" });
  });

  it("recognizes a next appointment query", () => {
    expect(interpretStaffAgendaQuery("Qual é meu próximo atendimento?")).toEqual({ kind: "next_appointment" });
  });

  it("recognizes tomorrow agenda without changing the existing today contract", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda amanhã?")).toEqual({ kind: "day_agenda", period: "full_day", day: "tomorrow" });
  });

  it("recognizes a daily count for tomorrow", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos tenho amanhã?")).toEqual({ kind: "day_summary", period: "full_day", day: "tomorrow" });
  });

  it("combines daily count and period", () => {
    expect(interpretStaffAgendaQuery("Quantas consultas tenho amanhã de manhã?")).toEqual({ kind: "day_summary", period: "morning", day: "tomorrow" });
  });

  it("does not classify a client booking request as a staff query", () => {
    expect(interpretStaffAgendaQuery("Quero agendar amanhã às dez horas")).toBeNull();
  });
});
