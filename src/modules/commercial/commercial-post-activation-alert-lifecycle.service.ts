import { z } from "zod";

import { commercialPostActivationAlertActionSchema } from "./commercial-post-activation-alert-action.service";
import type { CommercialPostActivationAlert } from "./commercial-post-activation-alerts.service";

const alertSchema = z.object({
  key: z.string().trim().min(1).max(500),
  severity: z.enum(["critical", "high"]),
  category: z.enum(["human_escalation", "milestone_overdue"]),
  onboardingId: z.string().uuid(),
  commercialClientId: z.string().uuid(),
  clientName: z.string().trim().min(1),
  planKey: z.string().trim().min(1),
  milestoneCode: z.string().trim().min(1).nullable(),
  milestoneTitle: z.string().trim().min(1).nullable(),
  ownerType: z.enum(["agent", "human"]).nullable(),
  dueAt: z.string().datetime().nullable(),
  reasons: z.array(z.string().trim().min(1)).max(50),
  supportWindowExpired: z.boolean(),
});

const inputSchema = z.object({
  alerts: z.array(alertSchema).max(100),
  actions: z.array(commercialPostActivationAlertActionSchema).max(1000),
});

export type CommercialPostActivationActionableAlert = CommercialPostActivationAlert & {
  lifecycle: "new" | "acknowledged";
  acknowledgedAt: string | null;
  acknowledgedBy: { type: "human" | "agent" | "system"; id: string } | null;
};

export type ProjectCommercialPostActivationAlertLifecycleResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      data: {
        alerts: CommercialPostActivationActionableAlert[];
        summary: {
          critical: number;
          high: number;
          new: number;
          acknowledged: number;
          resolved: number;
          total: number;
        };
      };
    };

export function projectCommercialPostActivationAlertLifecycle(
  rawInput: unknown,
): ProjectCommercialPostActivationAlertLifecycleResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados do ciclo de vida dos alertas são inválidos.",
    };
  }

  const input = parsed.data as {
    alerts: CommercialPostActivationAlert[];
    actions: Array<{
      idempotencyKey: string;
      alertKey: string;
      action: "acknowledged" | "resolved";
      note?: string;
      actor: { type: "human" | "agent" | "system"; id: string };
      actedAt: string;
    }>;
  };

  let resolved = 0;
  const alerts = input.alerts.flatMap<CommercialPostActivationActionableAlert>((alert) => {
    const actions = input.actions
      .filter((item) => item.alertKey === alert.key)
      .sort((left, right) => new Date(left.actedAt).getTime() - new Date(right.actedAt).getTime());
    const resolution = actions.findLast((item) => item.action === "resolved");
    if (resolution) {
      resolved += 1;
      return [];
    }

    const acknowledgement = actions.findLast((item) => item.action === "acknowledged") ?? null;
    return [{
      ...alert,
      lifecycle: acknowledgement ? "acknowledged" : "new",
      acknowledgedAt: acknowledgement?.actedAt ?? null,
      acknowledgedBy: acknowledgement?.actor ?? null,
    }];
  });

  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const high = alerts.length - critical;
  const acknowledged = alerts.filter((alert) => alert.lifecycle === "acknowledged").length;

  return {
    ok: true,
    data: {
      alerts,
      summary: {
        critical,
        high,
        new: alerts.length - acknowledged,
        acknowledged,
        resolved,
        total: alerts.length,
      },
    },
  };
}
