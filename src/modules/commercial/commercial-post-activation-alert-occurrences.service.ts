import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationAlertOccurrences } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { commercialPostActivationAlertActionSchema } from "./commercial-post-activation-alert-action.service";

const alertSchema = z.object({
  key: z.string().trim().min(1).max(500),
  severity: z.enum(["critical", "high"]),
  category: z.enum(["human_escalation", "milestone_overdue"]),
  onboardingId: z.string().uuid(),
  commercialClientId: z.string().uuid(),
});

const resolutionActionSchema = commercialPostActivationAlertActionSchema.extend({
  onboardingId: z.string().uuid(),
  commercialClientId: z.string().uuid(),
});

const inputSchema = z.object({
  alerts: z.array(alertSchema).max(1000),
  actions: z.array(resolutionActionSchema).max(10000),
});

type ActiveAlert = {
  key: string;
  severity: "critical" | "high";
  category: "human_escalation" | "milestone_overdue";
  onboardingId: string;
  commercialClientId: string;
};

type ResolutionAction = {
  alertKey: string;
  action: "acknowledged" | "resolved";
  actedAt: string;
  onboardingId: string;
  commercialClientId: string;
};

type OccurrenceTx = {
  upsertActive(input: ActiveAlert & { observedAt: Date }): Promise<void>;
  resolve(alertKey: string, resolvedAt: Date): Promise<"resolved" | "replayed" | "missing">;
  backfillResolved(input: {
    alertKey: string;
    onboardingId: string;
    commercialClientId: string;
    severity: "critical" | "high";
    category: "human_escalation" | "milestone_overdue";
    resolvedAt: Date;
  }): Promise<boolean>;
};

type OccurrenceStore = {
  transaction<T>(callback: (tx: OccurrenceTx) => Promise<T>): Promise<T>;
};

export type SynchronizeCommercialPostActivationAlertOccurrencesResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      observed: number;
      resolved: number;
      replayedResolutions: number;
      reconciledResolutions: number;
      missingOccurrences: number;
    };

export async function synchronizeCommercialPostActivationAlertOccurrences(
  rawInput: unknown,
  options: { store?: OccurrenceStore; now?: () => Date } = {},
): Promise<SynchronizeCommercialPostActivationAlertOccurrencesResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados das ocorrências de alertas pós-ativação inválidos.",
    };
  }

  const input = parsed.data as unknown as {
    alerts: ActiveAlert[];
    actions: ResolutionAction[];
  };
  const observedAt = options.now?.() ?? new Date();
  const store = options.store ?? createDrizzleOccurrenceStore();

  return store.transaction(async (tx) => {
    for (const alert of input.alerts) {
      await tx.upsertActive({ ...alert, observedAt });
    }

    let resolved = 0;
    let replayedResolutions = 0;
    let reconciledResolutions = 0;
    let missingOccurrences = 0;
    for (const action of input.actions) {
      if (action.action !== "resolved") continue;
      const outcome = await tx.resolve(action.alertKey, new Date(action.actedAt));
      if (outcome === "resolved") resolved += 1;
      if (outcome === "replayed") replayedResolutions += 1;
      if (outcome === "missing") {
        const identity = parseAlertIdentity(action.alertKey, action.onboardingId);
        if (!identity) {
          missingOccurrences += 1;
          continue;
        }
        const inserted = await tx.backfillResolved({
          alertKey: action.alertKey,
          onboardingId: action.onboardingId,
          commercialClientId: action.commercialClientId,
          ...identity,
          resolvedAt: new Date(action.actedAt),
        });
        if (inserted) reconciledResolutions += 1;
        else replayedResolutions += 1;
      }
    }

    return {
      ok: true,
      observed: input.alerts.length,
      resolved,
      replayedResolutions,
      reconciledResolutions,
      missingOccurrences,
    };
  });
}

function parseAlertIdentity(alertKey: string, onboardingId: string) {
  const [keyOnboardingId, category] = alertKey.split(":");
  if (keyOnboardingId !== onboardingId) return null;
  if (category === "human_escalation") {
    return { category, severity: "critical" as const };
  }
  if (category === "milestone_overdue") {
    return { category, severity: "high" as const };
  }
  return null;
}

function createDrizzleOccurrenceStore(): OccurrenceStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async upsertActive(input) {
        await databaseTx.insert(commercialPostActivationAlertOccurrences).values({
          alertKey: input.key,
          onboardingId: input.onboardingId,
          commercialClientId: input.commercialClientId,
          severity: input.severity,
          category: input.category,
          openedAt: input.observedAt,
          lastObservedAt: input.observedAt,
          updatedAt: input.observedAt,
        }).onConflictDoUpdate({
          target: commercialPostActivationAlertOccurrences.alertKey,
          set: {
            severity: input.severity,
            category: input.category,
            lastObservedAt: input.observedAt,
            updatedAt: input.observedAt,
          },
        });
      },
      async resolve(alertKey, resolvedAt) {
        const existing = await databaseTx.select({
          resolvedAt: commercialPostActivationAlertOccurrences.resolvedAt,
        }).from(commercialPostActivationAlertOccurrences)
          .where(eq(commercialPostActivationAlertOccurrences.alertKey, alertKey))
          .limit(1);
        if (!existing[0]) return "missing";
        if (existing[0].resolvedAt) return "replayed";

        await databaseTx.update(commercialPostActivationAlertOccurrences).set({
          resolvedAt,
          updatedAt: resolvedAt,
        }).where(eq(commercialPostActivationAlertOccurrences.alertKey, alertKey));
        return "resolved";
      },
      async backfillResolved(input) {
        const rows = await databaseTx.insert(commercialPostActivationAlertOccurrences).values({
          alertKey: input.alertKey,
          onboardingId: input.onboardingId,
          commercialClientId: input.commercialClientId,
          severity: input.severity,
          category: input.category,
          openedAt: input.resolvedAt,
          lastObservedAt: input.resolvedAt,
          resolvedAt: input.resolvedAt,
          createdAt: input.resolvedAt,
          updatedAt: input.resolvedAt,
        }).onConflictDoNothing({
          target: commercialPostActivationAlertOccurrences.alertKey,
        }).returning({
          id: commercialPostActivationAlertOccurrences.id,
        });
        return Boolean(rows[0]);
      },
    })),
  };
}
