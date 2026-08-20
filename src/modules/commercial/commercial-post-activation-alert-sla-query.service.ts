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

const storedOccurrenceSchema = z.object({
  alertKey: z.string().trim().min(1).max(500),
  onboardingId: z.string().uuid(),
  severity: z.enum(["critical", "high"]),
  openedAt: z.union([z.date(), z.string().datetime()]),
});

type StoredOccurrence = {
  alertKey: string;
  onboardingId: string;
  severity: string;
  openedAt: Date | string;
};

type AlertSlaQueryStore = {
  listOccurrences(limit: number): Promise<StoredOccurrence[]>;
  listActions(onboardingIds: string[]): Promise<unknown[]>;
};

type SlaData = Extract<
  ProjectCommercialPostActivationAlertSlaResult,
  { ok: true }
>["data"];

export type ListCommercialPostActivationAlertSlaResult =
  | {
      ok: false;
      error: "invalid_sla_data";
      message: string;
    }
  | {
      ok: true;
      data: SlaData & { invalidRecords: number };
    };

export async function listCommercialPostActivationAlertSla(
  options: {
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

  const projected = projectCommercialPostActivationAlertSla({
    alerts: occurrences.map(({ onboardingId: _onboardingId, ...occurrence }) => occurrence),
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

  return {
    ok: true,
    data: {
      ...projected.data,
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
