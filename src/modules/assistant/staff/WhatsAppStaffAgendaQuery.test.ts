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

  it("captures a weekday for business-timezone resolution", () => {
    const text = "Como está minha agenda segunda-feira?";
    expect(interpretStaffAgendaQuery(text)).toEqual({ kind: "day_agenda", period: "full_day", day: "specific", dateText: text });
  });

  it("captures a spoken day for a count query", () => {
    const text = "Quantos atendimentos tenho dia cinco à tarde?";
    expect(interpretStaffAgendaQuery(text)).toEqual({ kind: "day_summary", period: "afternoon", day: "specific", dateText: text });
  });

  it("recognizes the exact production audio transcript", () => {
    const text = "Quantos atendimentos tem o dia cinco?";
    expect(interpretStaffAgendaQuery(text)).toEqual({ kind: "day_summary", period: "full_day", day: "specific", dateText: text });
  });

  it("accepts reordered first-person speech without broadening booking intent", () => {
    const text = "Quantos atendimentos eu tenho amanhã?";
    expect(interpretStaffAgendaQuery(text)).toEqual({ kind: "day_summary", period: "full_day", day: "tomorrow" });
  });

  it("recognizes a count for the current week", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos tenho esta semana?")).toEqual({ kind: "day_summary", period: "full_day", day: "this_week" });
  });

  it("recognizes a next-week agenda with a period", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda na próxima semana à tarde?")).toEqual({ kind: "day_agenda", period: "afternoon", day: "next_week" });
  });

  it("recognizes a count for the current month", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos tenho este mês?")).toEqual({ kind: "day_summary", period: "full_day", day: "this_month" });
  });

  it("recognizes the next month agenda", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda no próximo mês?")).toEqual({ kind: "day_agenda", period: "full_day", day: "next_month" });
  });

  it("recognizes a named month", () => {
    const text = "Quantos atendimentos tenho em outubro?";
    expect(interpretStaffAgendaQuery(text)).toEqual({ kind: "day_summary", period: "full_day", day: "specific_month", dateText: text });
  });

  it("recognizes the exact production transcript with esse mês", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos tenho esse mês?")).toEqual({ kind: "day_summary", period: "full_day", day: "this_month" });
  });

  it("recognizes the exact production transcript with essa semana", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda essa semana?")).toEqual({ kind: "day_agenda", period: "full_day", day: "this_week" });
  });

  it("accepts neste mês and nesta semana variants", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos eu tenho neste mês?")).toEqual({ kind: "day_summary", period: "full_day", day: "this_month" });
    expect(interpretStaffAgendaQuery("Como está minha agenda nesta semana?")).toEqual({ kind: "day_agenda", period: "full_day", day: "this_week" });
  });

  it("extracts a titled professional from a manager count", () => {
    expect(interpretStaffAgendaQuery("Quantos atendimentos a Dra. Ana tem amanhã?")).toEqual({ kind: "day_summary", period: "full_day", day: "tomorrow", professionalName: "ana" });
  });

  it("extracts a titled professional from an agenda query", () => {
    expect(interpretStaffAgendaQuery("Como está a agenda do Dr. João amanhã?")).toEqual({ kind: "day_agenda", period: "full_day", day: "tomorrow", professionalName: "joao" });
  });

  it("does not classify a client booking request as a staff query", () => {
    expect(interpretStaffAgendaQuery("Quero agendar segunda-feira às dez horas")).toBeNull();
  });
});
