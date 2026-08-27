import { describe, expect, it } from "vitest";
import { getSchedulingVocabulary } from "./schedulingVocabulary";

describe("scheduling presentation vocabulary", () => {
  it("uses clear Portuguese business language", () => {
    expect(getSchedulingVocabulary("pt-BR")).toEqual({
      singular: "Agendamento",
      plural: "Agendamentos",
      new: "Novo agendamento",
      journey: "Jornada do agendamento",
    });
  });

  it("keeps the Spanish presentation boundary ready", () => {
    expect(getSchedulingVocabulary("es")).toEqual({
      singular: "Cita",
      plural: "Citas",
      new: "Nueva cita",
      journey: "Recorrido de la cita",
    });
  });
});
