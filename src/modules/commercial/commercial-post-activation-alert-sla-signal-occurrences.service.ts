import { and, eq, isNull, notInArray } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationAlertSlaSignalOccurrences } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const signalSchema = z.object({
  key: z.string().trim().min(1).max(600),
  alertKey: z.string().trim().min(1).max(500),
  type: z.enum(["acknowledgement_breached", "resolution_breached"]),
  severity: z.enum(["critical", "high"]),
});
const inputSchema = z.object({ signals: z.array(signalSchema).max(1000) });

type ActiveSignal = z.infer<typeof signalSchema>;
type SignalOccurrenceTx = {
  upsertActive(input: ActiveSignal & { observedAt: Date }): Promise<"created" | "observed">;
  resolveInactive(activeKeys: string[], resolvedAt: Date): Promise<number>;
};
type SignalOccurrenceStore = {
  transaction<T>(callback: (tx: SignalOccurrenceTx) => Promise<T>): Promise<T>;
};

export type SynchronizeCommercialPostActivationAlertSlaSignalOccurrencesResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      created: number;
      observed: number;
      resolved: number;
      active: number;
    };

export async function synchronizeCommercialPostActivationAlertSlaSignalOccurrences(
  rawInput: unknown,
  options: { store?: SignalOccurrenceStore; now?: () => Date } = {},
): Promise<SynchronizeCommercialPostActivationAlertSlaSignalOccurrencesResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados das ocorrências dos sinais de SLA inválidos.",
    };
  }
  const observedAt = options.now?.() ?? new Date();
  const store = options.store ?? createDrizzleSignalOccurrenceStore();

  return store.transaction(async (tx) => {
    let created = 0;
    let observed = 0;
    for (const signal of parsed.data.signals) {
      const outcome = await tx.upsertActive({ ...signal, observedAt });
      if (outcome === "created") created += 1;
      else observed += 1;
    }
    const activeKeys = parsed.data.signals.map((signal) => signal.key);
    const resolved = await tx.resolveInactive(activeKeys, observedAt);
    return { ok: true, created, observed, resolved, active: activeKeys.length };
  });
}

function createDrizzleSignalOccurrenceStore(): SignalOccurrenceStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async upsertActive(input) {
        const inserted = await databaseTx
          .insert(commercialPostActivationAlertSlaSignalOccurrences)
          .values({
            signalKey: input.key,
            alertKey: input.alertKey,
            signalType: input.type,
            severity: input.severity,
            firstObservedAt: input.observedAt,
            lastObservedAt: input.observedAt,
            updatedAt: input.observedAt,
          })
          .onConflictDoNothing({
            target: commercialPostActivationAlertSlaSignalOccurrences.signalKey,
          })
          .returning({ id: commercialPostActivationAlertSlaSignalOccurrences.id });
        if (inserted[0]) return "created";
        await databaseTx.update(commercialPostActivationAlertSlaSignalOccurrences).set({
          signalType: input.type,
          severity: input.severity,
          lastObservedAt: input.observedAt,
          resolvedAt: null,
          updatedAt: input.observedAt,
        }).where(eq(commercialPostActivationAlertSlaSignalOccurrences.signalKey, input.key));
        return "observed";
      },
      async resolveInactive(activeKeys, resolvedAt) {
        const condition = activeKeys.length === 0
          ? isNull(commercialPostActivationAlertSlaSignalOccurrences.resolvedAt)
          : and(
              isNull(commercialPostActivationAlertSlaSignalOccurrences.resolvedAt),
              notInArray(commercialPostActivationAlertSlaSignalOccurrences.signalKey, activeKeys),
            );
        const rows = await databaseTx.update(commercialPostActivationAlertSlaSignalOccurrences)
          .set({ resolvedAt, updatedAt: resolvedAt }).where(condition)
          .returning({ id: commercialPostActivationAlertSlaSignalOccurrences.id });
        return rows.length;
      },
    })),
  };
}
