import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialClients, commercialOnboardings, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { buildCommercialPostActivationAlerts } from "./commercial-post-activation-alerts.service";
import { buildCommercialPostActivationMonitoring } from "./commercial-post-activation-monitoring.service";

const actorSchema = z.object({
  type: z.enum(["human", "agent", "system"]),
  id: z.string().trim().min(1).max(200),
});

export const commercialPostActivationAlertActionSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  alertKey: z.string().trim().min(1).max(400),
  action: z.enum(["acknowledged", "resolved"]),
  note: z.string().trim().min(1).max(1000).optional(),
  actor: actorSchema,
  actedAt: z.string().datetime(),
});

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  alertAction: commercialPostActivationAlertActionSchema,
});

const historySchema = z.array(commercialPostActivationAlertActionSchema).max(1000);

type AlertAction = z.output<typeof commercialPostActivationAlertActionSchema>;

type AlertActionRecord = {
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
  status: string;
  result: Record<string, unknown>;
};

type AlertActionStore = {
  transaction<T>(callback: (tx: {
    findOnboarding(onboardingId: string): Promise<AlertActionRecord | null>;
    saveResult(onboardingId: string, result: Record<string, unknown>, updatedAt: Date): Promise<void>;
    emit(input: {
      aggregateId: string;
      eventType: string;
      dedupeKey: string;
      payload: Record<string, unknown>;
    }): Promise<boolean>;
  }) => Promise<T>): Promise<T>;
};

export type RecordCommercialPostActivationAlertActionInput = z.input<typeof inputSchema>;

export type RecordCommercialPostActivationAlertActionResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      alertKey: string;
      action: AlertAction["action"];
      actionCount: number;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "post_activation_not_available"
        | "alert_not_active"
        | "action_conflict"
        | "invalid_action_history";
      message: string;
    };

export async function recordCommercialPostActivationAlertAction(
  rawInput: RecordCommercialPostActivationAlertActionInput,
  options: { store?: AlertActionStore; now?: () => Date } = {},
): Promise<RecordCommercialPostActivationAlertActionResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Ação de alerta pós-ativação inválida.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleAlertActionStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const onboarding = await tx.findOnboarding(input.onboardingId);
    if (!onboarding) {
      return { ok: false, error: "onboarding_not_found", message: "O onboarding informado não foi encontrado." };
    }
    if (onboarding.status !== "completed") {
      return { ok: false, error: "post_activation_not_available", message: "O acompanhamento pós-ativação ainda não está disponível." };
    }

    const history = historySchema.safeParse(onboarding.result.postActivationAlertActions ?? []);
    if (!history.success) {
      return { ok: false, error: "invalid_action_history", message: "O histórico de ações dos alertas é inválido." };
    }

    const existing = history.data.find((item) => item.idempotencyKey === input.alertAction.idempotencyKey);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(input.alertAction)) {
        return { ok: false, error: "action_conflict", message: "A chave de idempotência já foi usada por outra ação." };
      }
      return {
        ok: true,
        replayed: true,
        onboardingId: input.onboardingId,
        alertKey: input.alertAction.alertKey,
        action: input.alertAction.action,
        actionCount: history.data.length,
        emittedEvents: [],
      };
    }

    const monitoring = buildCommercialPostActivationMonitoring({
      onboardingId: input.onboardingId,
      result: onboarding.result,
    }, { now: () => now });
    if (monitoring.ok === false) {
      return { ok: false, error: "post_activation_not_available", message: "O acompanhamento pós-ativação ainda não está disponível." };
    }
    const built = buildCommercialPostActivationAlerts([{
      onboardingId: input.onboardingId,
      commercialClientId: onboarding.commercialClientId,
      clientName: onboarding.clientName,
      monitoring: monitoring.monitoring,
    }]);
    const activeAlert = built.ok
      ? built.data.alerts.find((alert) => alert.key === input.alertAction.alertKey)
      : undefined;
    if (!activeAlert) {
      return { ok: false, error: "alert_not_active", message: "O alerta informado não está ativo." };
    }

    const actions = [...history.data, input.alertAction];
    await tx.saveResult(input.onboardingId, {
      ...onboarding.result,
      postActivationAlertActions: actions,
    }, now);

    const eventType = `commercial.post_activation.alert_${input.alertAction.action}`;
    const emitted = await tx.emit({
      aggregateId: input.onboardingId,
      eventType,
      dedupeKey: `${eventType}:${input.alertAction.idempotencyKey}`,
      payload: {
        onboardingId: input.onboardingId,
        commercialClientId: onboarding.commercialClientId,
        alert: activeAlert,
        alertAction: input.alertAction,
      },
    });

    return {
      ok: true,
      replayed: false,
      onboardingId: input.onboardingId,
      alertKey: input.alertAction.alertKey,
      action: input.alertAction.action,
      actionCount: actions.length,
      emittedEvents: emitted ? [eventType] : [],
    };
  });
}

function createDrizzleAlertActionStore(): AlertActionStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findOnboarding(onboardingId) {
        const rows = await databaseTx.select({
          onboardingId: commercialOnboardings.id,
          commercialClientId: commercialClients.id,
          legalName: commercialClients.legalName,
          tradeName: commercialClients.tradeName,
          status: commercialOnboardings.status,
          result: commercialOnboardings.result,
        }).from(commercialOnboardings)
          .innerJoin(commercialClients, eq(commercialClients.id, commercialOnboardings.commercialClientId))
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        const row = rows[0];
        return row ? {
          onboardingId: row.onboardingId,
          commercialClientId: row.commercialClientId,
          clientName: row.tradeName?.trim() || row.legalName,
          status: row.status,
          result: (row.result ?? {}) as Record<string, unknown>,
        } : null;
      },
      async saveResult(onboardingId, result, updatedAt) {
        await databaseTx.update(commercialOnboardings)
          .set({ result, updatedAt })
          .where(eq(commercialOnboardings.id, onboardingId));
      },
      async emit(value) {
        const rows = await databaseTx.insert(outbox).values({
          aggregateType: "commercial_onboarding",
          aggregateId: value.aggregateId,
          eventType: value.eventType,
          dedupeKey: value.dedupeKey,
          payload: value.payload,
        }).onConflictDoNothing().returning({ id: outbox.id });
        return Boolean(rows[0]);
      },
    })),
  };
}
