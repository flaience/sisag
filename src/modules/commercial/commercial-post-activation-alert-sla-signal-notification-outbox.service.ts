import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  commercialPostActivationAlertSlaSignalOccurrences,
  outbox,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const notificationSchema = z.object({
  key: z.string().trim().min(1).max(800),
  dedupeKey: z.string().trim().min(1).max(800),
  eventType: z.literal("commercial.post_activation.alert_sla_breached"),
  aggregateType: z.literal("commercial_post_activation_alert"),
  aggregateKey: z.string().trim().min(1).max(500),
  payload: z.object({
    signalKey: z.string().trim().min(1).max(600),
    alertKey: z.string().trim().min(1).max(500),
    breachType: z.enum(["acknowledgement_breached", "resolution_breached"]),
    severity: z.enum(["critical", "high"]),
    priority: z.enum(["critical", "high"]),
    elapsedMinutes: z.number().int().nonnegative(),
    targetMinutes: z.number().int().positive(),
    overdueMinutes: z.number().int().nonnegative(),
  }),
}).superRefine((notification, context) => {
  const expectedKey = `${notification.eventType}:${notification.payload.signalKey}`;
  if (notification.key !== expectedKey || notification.dedupeKey !== expectedKey) {
    context.addIssue({
      code: "custom",
      message: "A chave da notificação não corresponde ao sinal.",
      path: ["dedupeKey"],
    });
  }
  if (
    notification.aggregateKey !== notification.payload.alertKey
    || !notification.payload.signalKey.startsWith(`${notification.payload.alertKey}:`)
  ) {
    context.addIssue({
      code: "custom",
      message: "A notificação não corresponde ao alerta informado.",
      path: ["aggregateKey"],
    });
  }
});

const inputSchema = z.object({
  notifications: z.array(notificationSchema).max(1000),
});

type Notification = z.infer<typeof notificationSchema>;
type NotificationOutboxTx = {
  enqueue(notification: Notification): Promise<"queued" | "replayed" | "missing_occurrence">;
};
type NotificationOutboxStore = {
  transaction<T>(callback: (tx: NotificationOutboxTx) => Promise<T>): Promise<T>;
};

export type EnqueueCommercialPostActivationAlertSlaSignalNotificationsResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      queued: number;
      replayed: number;
      missingOccurrences: number;
      total: number;
    };

export async function enqueueCommercialPostActivationAlertSlaSignalNotifications(
  rawInput: unknown,
  options: { store?: NotificationOutboxStore } = {},
): Promise<EnqueueCommercialPostActivationAlertSlaSignalNotificationsResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Intenções de notificação dos sinais de SLA inválidas.",
    };
  }

  const store = options.store ?? createDrizzleNotificationOutboxStore();
  return store.transaction(async (tx) => {
    let queued = 0;
    let replayed = 0;
    let missingOccurrences = 0;

    for (const notification of parsed.data.notifications) {
      const outcome = await tx.enqueue(notification);
      if (outcome === "queued") queued += 1;
      else if (outcome === "replayed") replayed += 1;
      else missingOccurrences += 1;
    }

    return {
      ok: true,
      queued,
      replayed,
      missingOccurrences,
      total: parsed.data.notifications.length,
    };
  });
}

function createDrizzleNotificationOutboxStore(): NotificationOutboxStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async enqueue(notification) {
        const occurrences = await databaseTx
          .select({ id: commercialPostActivationAlertSlaSignalOccurrences.id })
          .from(commercialPostActivationAlertSlaSignalOccurrences)
          .where(and(
            eq(
              commercialPostActivationAlertSlaSignalOccurrences.signalKey,
              notification.payload.signalKey,
            ),
            isNull(commercialPostActivationAlertSlaSignalOccurrences.resolvedAt),
          ))
          .limit(1);
        const occurrence = occurrences[0];
        if (!occurrence) return "missing_occurrence";

        const inserted = await databaseTx.insert(outbox).values({
          aggregateType: notification.aggregateType,
          aggregateId: occurrence.id,
          eventType: notification.eventType,
          dedupeKey: notification.dedupeKey,
          payload: notification.payload,
          status: "pending",
        }).onConflictDoNothing().returning({ id: outbox.id });

        return inserted[0] ? "queued" : "replayed";
      },
    })),
  };
}
