import { describe, expect, it } from "vitest";
import { interpretStaffAgendaQuery } from "./WhatsAppStaffAgendaQuery";

describe("WhatsApp staff agenda query", () => {
  it("recognizes the production phrase for the afternoon agenda", () => {
    expect(interpretStaffAgendaQuery("Como está minha agenda da tarde?")).toEqual({ kind: "day_agenda", period: "afternoon" });
  });

  it("recognizes a next appointment query", () => {
    expect(interpretStaffAgendaQuery("Qual é meu próximo atendimento?")).toEqual({ kind: "next_appointment" });
  });

  it("does not classify a client booking request as a staff query", () => {
    expect(interpretStaffAgendaQuery("Quero agendar amanhã às dez horas")).toBeNull();
  });
});
