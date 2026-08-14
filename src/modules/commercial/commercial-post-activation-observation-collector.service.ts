import { z } from "zod";

import { commercialPostActivationObservationSchema } from "./commercial-post-activation-observations.service";

const milestoneCodeSchema = z.enum([
  "welcome",
  "adoption_d1",
  "adoption_d3",
  "adoption_d7",
  "assisted_support_close_d14",
]);

export type CollectCommercialPostActivationObservationsResult =
  | { ok: true; observations: Record<string, boolean>; observationCount: number }
  | { ok: false; error: "invalid_observation_history"; message: string };

export function collectCommercialPostActivationObservations(
  rawHistory: unknown,
  rawMilestoneCode: string,
): CollectCommercialPostActivationObservationsResult {
  const milestone = milestoneCodeSchema.safeParse(rawMilestoneCode);
  const history = z.array(commercialPostActivationObservationSchema).max(1000)
    .safeParse(rawHistory ?? []);
  if (!milestone.success || !history.success) {
    return {
      ok: false,
      error: "invalid_observation_history",
      message: "O histórico de observações pós-ativação é inválido.",
    };
  }

  const selected = history.data
    .map((observation, index) => ({ observation, index }))
    .filter(({ observation }) => observation.milestoneCode === milestone.data)
    .sort((left, right) => {
      const byDate = new Date(left.observation.observedAt).getTime()
        - new Date(right.observation.observedAt).getTime();
      return byDate || left.index - right.index;
    });

  const observations: Record<string, boolean> = {};
  for (const { observation } of selected) {
    observations[observation.indicator] = observation.value;
  }

  return {
    ok: true,
    observations,
    observationCount: selected.length,
  };
}
