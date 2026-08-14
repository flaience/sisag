import { z } from "zod";

const alertCandidateSchema = z.object({
  onboardingId: z.string().uuid(),
  commercialClientId: z.string().uuid(),
  clientName: z.string().trim().min(1),
  monitoring: z.object({
    planKey: z.string().trim().min(1),
    status: z.enum(["scheduled", "waiting", "overdue", "escalated", "completed"]),
    currentMilestone: z.object({
      code: z.string().trim().min(1),
      title: z.string().trim().min(1),
      ownerType: z.enum(["agent", "human"]),
      dueAt: z.string().datetime(),
    }).nullable(),
    missingIndicators: z.array(z.string().trim().min(1)).max(50),
    activeEscalations: z.array(z.string().trim().min(1)).max(50),
    supportWindowExpired: z.boolean(),
  }),
});

const inputSchema = z.array(alertCandidateSchema).max(100);

export type CommercialPostActivationAlert = {
  key: string;
  severity: "critical" | "high";
  category: "human_escalation" | "milestone_overdue";
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
  planKey: string;
  milestoneCode: string | null;
  milestoneTitle: string | null;
  ownerType: "agent" | "human" | null;
  dueAt: string | null;
  reasons: string[];
  supportWindowExpired: boolean;
};

export type BuildCommercialPostActivationAlertsResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      data: {
        alerts: CommercialPostActivationAlert[];
        summary: { critical: number; high: number; total: number };
      };
    };

export function buildCommercialPostActivationAlerts(
  rawCandidates: unknown,
): BuildCommercialPostActivationAlertsResult {
  const parsed = inputSchema.safeParse(rawCandidates);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados de alertas pós-ativação inválidos.",
    };
  }

  const alerts = parsed.data.flatMap<CommercialPostActivationAlert>((candidate) => {
    const { monitoring } = candidate;
    if (monitoring.status !== "escalated" && monitoring.status !== "overdue") {
      return [];
    }

    const milestone = monitoring.currentMilestone;
    const isEscalated = monitoring.status === "escalated";
    const reasons = isEscalated
      ? monitoring.activeEscalations.length > 0
        ? monitoring.activeEscalations
        : ["historical_escalation"]
      : monitoring.missingIndicators.length > 0
        ? monitoring.missingIndicators
        : ["milestone_due_without_observations"];

    return [{
      key: `${candidate.onboardingId}:${isEscalated ? "human_escalation" : "milestone_overdue"}:${milestone?.code ?? "plan"}`,
      severity: isEscalated ? "critical" : "high",
      category: isEscalated ? "human_escalation" : "milestone_overdue",
      onboardingId: candidate.onboardingId,
      commercialClientId: candidate.commercialClientId,
      clientName: candidate.clientName,
      planKey: monitoring.planKey,
      milestoneCode: milestone?.code ?? null,
      milestoneTitle: milestone?.title ?? null,
      ownerType: milestone?.ownerType ?? null,
      dueAt: milestone?.dueAt ?? null,
      reasons: [...reasons].sort(),
      supportWindowExpired: monitoring.supportWindowExpired,
    }];
  });

  alerts.sort((left, right) => {
    const bySeverity = (left.severity === "critical" ? 0 : 1)
      - (right.severity === "critical" ? 0 : 1);
    if (bySeverity) return bySeverity;
    const leftDueAt = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDueAt = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDueAt !== rightDueAt) return leftDueAt - rightDueAt;
    return left.key.localeCompare(right.key);
  });

  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const high = alerts.length - critical;
  return {
    ok: true,
    data: { alerts, summary: { critical, high, total: alerts.length } },
  };
}
