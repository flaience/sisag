import { z } from "zod";

const inputSchema = z.object({
  milestoneCode: z.enum([
    "welcome",
    "adoption_d1",
    "adoption_d3",
    "adoption_d7",
    "assisted_support_close_d14",
  ]),
  expectedTeamSize: z.number().int().positive().max(1000),
  snapshot: z.object({
    hasSchedulingConfiguration: z.boolean(),
    activeChannelCount: z.number().int().nonnegative(),
    appointmentsSinceActivation: z.number().int().nonnegative(),
    appointmentsLast7Days: z.number().int().nonnegative(),
    activeProfessionalCount: z.number().int().nonnegative(),
    professionalsWithAppointments: z.number().int().nonnegative(),
    outboundMessageCount: z.number().int().nonnegative(),
    failedMessageCount: z.number().int().nonnegative(),
  }),
});

export type CommercialPostActivationOperationalSnapshot = z.input<
  typeof inputSchema
>["snapshot"];

export type EvaluateCommercialPostActivationOperationalSignalsInput = z.input<
  typeof inputSchema
>;

export type EvaluateCommercialPostActivationOperationalSignalsResult =
  | { ok: false; error: "invalid_input"; message: string }
  | { ok: true; signals: Record<string, boolean> };

export function evaluateCommercialPostActivationOperationalSignals(
  rawInput: EvaluateCommercialPostActivationOperationalSignalsInput,
): EvaluateCommercialPostActivationOperationalSignalsResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Métricas operacionais inválidas.",
    };
  }

  const { milestoneCode, expectedTeamSize, snapshot } = parsed.data;
  const signals: Record<string, boolean> = {};

  if (milestoneCode === "adoption_d1") {
    if (snapshot.hasSchedulingConfiguration && snapshot.appointmentsSinceActivation > 0) {
      signals.scheduling_activity = true;
    }
    if (snapshot.activeChannelCount > 0) {
      signals.active_channel_health = true;
    }
  }

  if (milestoneCode === "adoption_d3") {
    if (snapshot.appointmentsSinceActivation > 0) signals.appointments_created = true;
    if (snapshot.professionalsWithAppointments > 0) signals.team_activity = true;
    if (hasReliableDeliveryRate(snapshot.outboundMessageCount, snapshot.failedMessageCount)) {
      signals.channel_delivery_rate = true;
    }
  }

  if (milestoneCode === "adoption_d7") {
    if (snapshot.appointmentsLast7Days > 0) signals.weekly_scheduling_volume = true;
    const requiredActiveProfessionals = Math.min(
      expectedTeamSize,
      snapshot.activeProfessionalCount,
    );
    if (
      requiredActiveProfessionals > 0
      && snapshot.professionalsWithAppointments >= requiredActiveProfessionals
    ) {
      signals.team_adoption = true;
    }
  }

  return { ok: true, signals };
}

function hasReliableDeliveryRate(total: number, failed: number) {
  if (total < 5 || failed > total) return false;
  return (total - failed) / total >= 0.9;
}
