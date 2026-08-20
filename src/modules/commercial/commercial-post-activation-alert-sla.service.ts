import { z } from "zod";

import { commercialPostActivationAlertActionSchema } from "./commercial-post-activation-alert-action.service";

const alertSchema = z.object({
  key: z.string().trim().min(1).max(400),
  severity: z.enum(["critical", "high"]),
  openedAt: z.string().datetime(),
});

const inputSchema = z.object({
  alerts: z.array(alertSchema).max(1000),
  actions: z.array(commercialPostActivationAlertActionSchema).max(10000),
});

type AlertInput = {
  key: string;
  severity: "critical" | "high";
  openedAt: string;
};

type ActionInput = {
  alertKey: string;
  action: "acknowledged" | "resolved";
  actedAt: string;
};

type SlaTarget = {
  acknowledgementMinutes: number;
  resolutionMinutes: number;
};

export type CommercialPostActivationAlertSlaTargets = Record<
  "critical" | "high",
  SlaTarget
>;

export type CommercialPostActivationAlertSlaItem = {
  alertKey: string;
  severity: "critical" | "high";
  lifecycle: "new" | "acknowledged" | "resolved";
  openedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  acknowledgementMinutes: number;
  resolutionMinutes: number;
  acknowledgementTargetMinutes: number;
  resolutionTargetMinutes: number;
  acknowledgementBreached: boolean;
  resolutionBreached: boolean;
};

export type ProjectCommercialPostActivationAlertSlaResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      data: {
        items: CommercialPostActivationAlertSlaItem[];
        summary: {
          total: number;
          open: number;
          acknowledged: number;
          resolved: number;
          acknowledgementBreached: number;
          resolutionBreached: number;
          withinSla: number;
          complianceRate: number;
        };
      };
    };

const defaultTargets: CommercialPostActivationAlertSlaTargets = {
  critical: { acknowledgementMinutes: 30, resolutionMinutes: 240 },
  high: { acknowledgementMinutes: 120, resolutionMinutes: 1440 },
};

export function projectCommercialPostActivationAlertSla(
  rawInput: unknown,
  options: {
    now?: () => Date;
    targets?: Partial<Record<"critical" | "high", Partial<SlaTarget>>>;
  } = {},
): ProjectCommercialPostActivationAlertSlaResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados de SLA dos alertas pós-ativação inválidos.",
    };
  }

  const targets = mergeTargets(options.targets);
  if (!targets) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Metas de SLA dos alertas pós-ativação inválidas.",
    };
  }

  const input = parsed.data as unknown as {
    alerts: AlertInput[];
    actions: ActionInput[];
  };
  const now = options.now?.() ?? new Date();
  const items: CommercialPostActivationAlertSlaItem[] = [];

  for (const alert of input.alerts) {
    const openedAt = new Date(alert.openedAt);
    const actions = input.actions
      .filter((item) => item.alertKey === alert.key)
      .sort((left, right) => (
        new Date(left.actedAt).getTime() - new Date(right.actedAt).getTime()
      ));
    if (actions.some((item) => new Date(item.actedAt).getTime() < openedAt.getTime())) {
      return {
        ok: false,
        error: "invalid_input",
        message: "Uma ação de alerta não pode ocorrer antes da abertura.",
      };
    }

    const acknowledgement = actions.find((item) => item.action === "acknowledged") ?? null;
    const resolution = actions.find((item) => item.action === "resolved") ?? null;
    const acknowledgementEnd = acknowledgement
      ? new Date(acknowledgement.actedAt)
      : resolution
        ? new Date(resolution.actedAt)
        : now;
    const resolutionEnd = resolution ? new Date(resolution.actedAt) : now;
    const target = targets[alert.severity];
    const acknowledgementMs = Math.max(0, acknowledgementEnd.getTime() - openedAt.getTime());
    const resolutionMs = Math.max(0, resolutionEnd.getTime() - openedAt.getTime());

    items.push({
      alertKey: alert.key,
      severity: alert.severity,
      lifecycle: resolution ? "resolved" : acknowledgement ? "acknowledged" : "new",
      openedAt: alert.openedAt,
      acknowledgedAt: acknowledgement?.actedAt ?? null,
      resolvedAt: resolution?.actedAt ?? null,
      acknowledgementMinutes: Math.round(acknowledgementMs / 60000),
      resolutionMinutes: Math.round(resolutionMs / 60000),
      acknowledgementTargetMinutes: target.acknowledgementMinutes,
      resolutionTargetMinutes: target.resolutionMinutes,
      acknowledgementBreached: acknowledgementMs > target.acknowledgementMinutes * 60000,
      resolutionBreached: resolutionMs > target.resolutionMinutes * 60000,
    });
  }

  items.sort((left, right) => {
    const breached = Number(right.resolutionBreached || right.acknowledgementBreached)
      - Number(left.resolutionBreached || left.acknowledgementBreached);
    if (breached) return breached;
    return new Date(left.openedAt).getTime() - new Date(right.openedAt).getTime();
  });

  const resolved = items.filter((item) => item.lifecycle === "resolved").length;
  const acknowledged = items.filter((item) => item.lifecycle === "acknowledged").length;
  const acknowledgementBreached = items.filter((item) => item.acknowledgementBreached).length;
  const resolutionBreached = items.filter((item) => item.resolutionBreached).length;
  const withinSla = items.filter((item) => (
    !item.acknowledgementBreached && !item.resolutionBreached
  )).length;

  return {
    ok: true,
    data: {
      items,
      summary: {
        total: items.length,
        open: items.length - resolved,
        acknowledged,
        resolved,
        acknowledgementBreached,
        resolutionBreached,
        withinSla,
        complianceRate: items.length === 0
          ? 100
          : Math.round((withinSla / items.length) * 100),
      },
    },
  };
}

function mergeTargets(
  overrides: Partial<Record<"critical" | "high", Partial<SlaTarget>>> | undefined,
): CommercialPostActivationAlertSlaTargets | null {
  const merged = {
    critical: { ...defaultTargets.critical, ...overrides?.critical },
    high: { ...defaultTargets.high, ...overrides?.high },
  };
  for (const target of Object.values(merged)) {
    if (!Number.isInteger(target.acknowledgementMinutes)
      || target.acknowledgementMinutes <= 0
      || !Number.isInteger(target.resolutionMinutes)
      || target.resolutionMinutes <= 0) {
      return null;
    }
  }
  return merged;
}
