import { desc, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  commercialOnboardings,
  commercialPostActivationAlertOccurrences,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { commercialPostActivationAlertActionSchema } from "./commercial-post-activation-alert-action.service";
import {
  projectCommercialPostActivationAlertSla,
  type CommercialPostActivationAlertSlaTargets,
  type ProjectCommercialPostActivationAlertSlaResult,
} from "./commercial-post-activation-alert-sla.service";

const inputSchema = z.object({
  severity: z.enum(["critical", "high"]).optional(),
  lifecycle: z.enum(["new", "acknowledged", "resolved"]).optional(),
  breach: z.enum(["acknowledgement", "resolution", "any"]).optional(),
  limit: z.number().int().positive().max(1000).default(100),
});

const storedOccurrenceSchema = z.object({
  alertKey: z.string().trim().min(1).max(500),
  onboardingId: z.string().uuid(),
  severity: z.enum(["critical", "high"]),
  openedAt: z.union([z.date(), z.string().datetime()]),
  resolvedAt: z.union([z.date(), z.string().datetime()]).nullable(),
});

type StoredOccurrence = {
  alertKey: string;
  onboardingId: string;
  severity: string;
  openedAt: Date | string;
  resolvedAt: Date | string | null;
};

type AlertSlaQueryStore = {
  listOccurrences(limit: number): Promise<StoredOccurrence[]>;
  listActions(onboardingIds: string[]): Promise<unknown[]>;
};

type SlaData = Extract<
  ProjectCommercialPostActivationAlertSlaResult,
  { ok: true }
>["data"];

export type ListCommercialPostActivationAlertSlaInput = {
  severity?: "critical" | "high";
  lifecycle?: "new" | "acknowledged" | "resolved";
  breach?: "acknowledgement" | "resolution" | "any";
  limit?: number;
};

export type ListCommercialPostActivationAlertSlaResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_sla_data";
      message: string;
    }
  | {
      ok: true;
      data: SlaData & { invalidRecords: number };
    };

export async function listCommercialPostActivationAlertSla(
  options: {
    severity?: ListCommercialPostActivationAlertSlaInput["severity"];
    lifecycle?: ListCommercialPostActivationAlertSlaInput["lifecycle"];
    breach?: ListCommercialPostActivationAlertSlaInput["breach"];
    limit?: number;
    store?: AlertSlaQueryStore;
    now?: () => Date;
    targets?: Partial<
      Record<
        "critical" | "high",
        Partial<CommercialPostActivationAlertSlaTargets["critical"]>
      >
    >;
  } = {},
): Promise<ListCommercialPostActivationAlertSlaResult> {
  const input = inputSchema.safeParse({
    severity: options.severity,
    lifecycle: options.lifecycle,
    breach: options.breach,
    limit: options.limit,
  });
  if (!input.success) {
    return { ok: false, error: "invalid_input", message: "Filtros de SLA dos alertas inválidos." };
  }

  const store = options.store ?? createDrizzleAlertSlaQueryStore();
  const storedOccurrences = await store.listOccurrences(1000);
  let invalidRecords = 0;
  const occurrences = storedOccurrences.flatMap((stored) => {
    const parsed = storedOccurrenceSchema.safeParse(stored);
    if (!parsed.success) {
      invalidRecords += 1;
      return [];
    }
    return [{
      key: parsed.data.alertKey,
      onboardingId: parsed.data.onboardingId,
      severity: parsed.data.severity,
      openedAt: parsed.data.openedAt instanceof Date
        ? parsed.data.openedAt.toISOString()
        : parsed.data.openedAt,
      resolvedAt: parsed.data.resolvedAt instanceof Date
        ? parsed.data.resolvedAt.toISOString()
        : parsed.data.resolvedAt,
    }];
  });

  const onboardingIds = [...new Set(occurrences.map((item) => item.onboardingId))];
  const storedActions = await store.listActions(onboardingIds);
  const actions = storedActions.flatMap((stored) => {
    const parsed = commercialPostActivationAlertActionSchema.safeParse(stored);
    if (!parsed.success) {
      invalidRecords += 1;
      return [];
    }
    return [parsed.data];
  });

  const alerts = occurrences.map((occurrence) => {
    let openedAt = occurrence.openedAt;
    const reconciled = occurrence.resolvedAt !== null
      && new Date(occurrence.resolvedAt).getTime() === new Date(openedAt).getTime();
    if (reconciled) {
      const earliestKnownAt = actions
        .filter((action) => action.alertKey === occurrence.key)
        .reduce(
          (earliest, action) => Math.min(
            earliest,
            new Date(action.actedAt).getTime(),
          ),
          new Date(openedAt).getTime(),
        );
      openedAt = new Date(earliestKnownAt).toISOString();
    }
    return { key: occurrence.key, severity: occurrence.severity, openedAt };
  });

  const projected = projectCommercialPostActivationAlertSla({
    alerts,
    actions,
  }, {
    now: options.now,
    targets: options.targets,
  });
  if (projected.ok === false) {
    return {
      ok: false,
      error: "invalid_sla_data",
      message: "Não foi possível projetar o SLA dos alertas pós-ativação.",
    };
  }

  const items = projected.data.items.filter((item) => (
    (!input.data.severity || item.severity === input.data.severity)
    && (!input.data.lifecycle || item.lifecycle === input.data.lifecycle)
    && (!input.data.breach
      || (input.data.breach === "acknowledgement" && item.acknowledgementBreached)
      || (input.data.breach === "resolution" && item.resolutionBreached)
      || (input.data.breach === "any"
        && (item.acknowledgementBreached || item.resolutionBreached)))
  )).slice(0, input.data.limit);
  const resolved = items.filter((item) => item.lifecycle === "resolved").length;
  const acknowledged = items.filter((item) => item.lifecycle === "acknowledged").length;
  const acknowledgementBreached = items
    .filter((item) => item.acknowledgementBreached).length;
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
      invalidRecords,
    },
  };
}

function createDrizzleAlertSlaQueryStore(): AlertSlaQueryStore {
  return {
    async listOccurrences(limit) {
      return getDb().select({
        alertKey: commercialPostActivationAlertOccurrences.alertKey,
        onboardingId: commercialPostActivationAlertOccurrences.onboardingId,
        severity: commercialPostActivationAlertOccurrences.severity,
        openedAt: commercialPostActivationAlertOccurrences.openedAt,
        resolvedAt: commercialPostActivationAlertOccurrences.resolvedAt,
      }).from(commercialPostActivationAlertOccurrences)
        .orderBy(desc(commercialPostActivationAlertOccurrences.openedAt))
        .limit(limit);
    },
    async listActions(onboardingIds) {
      if (onboardingIds.length === 0) return [];
      const rows = await getDb().select({
        result: commercialOnboardings.result,
      }).from(commercialOnboardings)
        .where(inArray(commercialOnboardings.id, onboardingIds));
      return rows.flatMap((row) => {
        const result = (row.result ?? {}) as Record<string, unknown>;
        return Array.isArray(result.postActivationAlertActions)
          ? result.postActivationAlertActions
          : [];
      });
    },
  };
}
