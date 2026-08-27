export type SchedulingLocale = "pt-BR" | "es";

const vocabulary = {
  "pt-BR": {
    singular: "Agendamento",
    plural: "Agendamentos",
    new: "Novo agendamento",
    journey: "Jornada do agendamento",
  },
  es: {
    singular: "Cita",
    plural: "Citas",
    new: "Nueva cita",
    journey: "Recorrido de la cita",
  },
} as const;

export function getSchedulingVocabulary(locale: SchedulingLocale = "pt-BR") {
  return vocabulary[locale];
}
