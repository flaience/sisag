import { z } from "zod";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  commercialClientId: z.string().uuid(),
  companyId: z.string().uuid(),
  activatedAt: z.string().datetime(),
  context: z.object({
    businessType: z.string().trim().min(1).max(100).default("generic"),
    activeChannels: z.array(z.string().trim().min(1).max(32)).min(1).max(20),
    teamSize: z.number().int().positive().max(1000),
  }),
});

export type BuildCommercialPostActivationFollowUpInput = z.input<typeof inputSchema>;

export type CommercialPostActivationMilestone = {
  code: "welcome" | "adoption_d1" | "adoption_d3" | "adoption_d7" | "assisted_support_close_d14";
  title: string;
  dueAt: string;
  ownerType: "agent" | "human";
  required: true;
  indicators: string[];
  escalationTriggers: string[];
};

export type CommercialPostActivationFollowUpPlan = {
  version: "2026-08-v1";
  key: string;
  onboardingId: string;
  commercialClientId: string;
  companyId: string;
  activatedAt: string;
  supportWindowEndsAt: string;
  context: {
    businessType: string;
    activeChannels: string[];
    teamSize: number;
  };
  milestones: CommercialPostActivationMilestone[];
};

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function buildCommercialPostActivationFollowUp(
  rawInput: BuildCommercialPostActivationFollowUpInput,
): CommercialPostActivationFollowUpPlan | null {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) return null;

  const input = parsed.data;
  const activeChannels = [...new Set(
    input.context.activeChannels.map((channel) => channel.toLowerCase()),
  )].sort();
  const context = {
    businessType: input.context.businessType,
    activeChannels,
    teamSize: input.context.teamSize,
  };
  const dueAt = (days: number) => addDays(input.activatedAt, days);

  return {
    version: "2026-08-v1",
    key: `${input.onboardingId}:post_activation:2026-08-v1`,
    onboardingId: input.onboardingId,
    commercialClientId: input.commercialClientId,
    companyId: input.companyId,
    activatedAt: input.activatedAt,
    supportWindowEndsAt: dueAt(14),
    context,
    milestones: [
      {
        code: "welcome",
        title: "Boas-vindas e confirmação da ativação",
        dueAt: dueAt(0),
        ownerType: "agent",
        required: true,
        indicators: ["welcome_delivered", "support_channel_confirmed"],
        escalationTriggers: ["welcome_delivery_failed", "support_channel_unavailable"],
      },
      {
        code: "adoption_d1",
        title: "Primeira verificação de adoção",
        dueAt: dueAt(1),
        ownerType: "agent",
        required: true,
        indicators: ["first_login", "scheduling_activity", "active_channel_health"],
        escalationTriggers: ["no_login", "no_scheduling_activity", "channel_unhealthy"],
      },
      {
        code: "adoption_d3",
        title: "Acompanhamento operacional inicial",
        dueAt: dueAt(3),
        ownerType: "agent",
        required: true,
        indicators: ["appointments_created", "team_activity", "channel_delivery_rate"],
        escalationTriggers: ["zero_appointments", "inactive_team", "delivery_rate_below_threshold"],
      },
      {
        code: "adoption_d7",
        title: "Revisão de adoção assistida",
        dueAt: dueAt(7),
        ownerType: "human",
        required: true,
        indicators: ["weekly_scheduling_volume", "team_adoption", "support_requests"],
        escalationTriggers: ["low_weekly_adoption", "repeated_support_requests", "customer_risk_reported"],
      },
      {
        code: "assisted_support_close_d14",
        title: "Encerramento do suporte assistido",
        dueAt: dueAt(14),
        ownerType: "human",
        required: true,
        indicators: ["stable_operation", "customer_acknowledgement", "open_critical_incidents"],
        escalationTriggers: ["operation_unstable", "customer_not_ready", "critical_incident_open"],
      },
    ],
  };
}

export function evaluateCommercialPostActivationMilestone(
  milestone: CommercialPostActivationMilestone,
  observations: Record<string, boolean>,
) {
  const missingIndicators = milestone.indicators.filter((indicator) => observations[indicator] !== true);
  const activeEscalations = milestone.escalationTriggers.filter((trigger) => observations[trigger] === true);
  return {
    completed: missingIndicators.length === 0 && activeEscalations.length === 0,
    requiresHumanEscalation: activeEscalations.length > 0,
    missingIndicators,
    activeEscalations,
  };
}

