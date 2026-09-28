import { describe, expect, it } from "vitest";
import { interpretMessage } from "./interpretMessage";

const reference = new Date("2026-09-28T13:00:00.000Z");

describe("WhatsApp reschedule intent", () => {
  it.each([
    "Quero remarcar meu agendamento.",
    "Preciso reagendar minha consulta",
    "Quero mudar o horário do agendamento",
    "Pode alterar a data da consulta?",
  ])("recognizes %s as reschedule instead of a new booking", (text) => {
    expect(interpretMessage(text, reference, "America/Sao_Paulo")).toMatchObject({
      intent: "RESCHEDULE_REQUEST",
    });
  });

  it("keeps spoken date and time in a reschedule request", () => {
    expect(
      interpretMessage(
        "Quero remarcar para segunda-feira, dia 5 de outubro, às onze horas.",
        reference,
        "America/Sao_Paulo",
      ),
    ).toMatchObject({
      intent: "RESCHEDULE_REQUEST",
      slots: { dateIso: "2026-10-05", time: "11:00" },
    });
  });

  it("does not change ordinary scheduling intent", () => {
    expect(
      interpretMessage("Quero marcar amanhã às dez horas", reference, "America/Sao_Paulo"),
    ).toMatchObject({ intent: "SCHEDULE_REQUEST" });
  });
});
