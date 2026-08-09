import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { outbox, subscriptions } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const manageableStatuses = [
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;

export type ManageableSubscriptionStatus =
  (typeof manageableStatuses)[number];
export type SubscriptionStatus =
  (typeof subscriptions.status.enumValues)[number];

const transitionTargets = {
  pending: ["active", "cancelled"],
  trial: ["active", "past_due", "suspended", "cancelled"],
  active: ["past_due", "suspended", "cancelled"],
  past_due: ["active", "suspended", "cancelled"],
  suspended: ["active", "cancelled"],
  cancelled: [],
} as const satisfies Record<SubscriptionStatus, readonly ManageableSubscriptionStatus[]>;

export function canTransitionSubscription(
  from: SubscriptionStatus,
  to: ManageableSubscriptionStatus,
) {
  return (transitionTargets[from] as readonly ManageableSubscriptionStatus[]).includes(to);
}

export const changeSubscriptionStatusInputSchema = z.object({
  subscriptionId: z.string().uuid(),
  targetStatus: z.enum(manageableStatuses),
  actor: z.object({
    type: z.enum(["user", "agent", "system", "api"]),
    id: z.string().trim().min(1).max(200),
  }),
  reason: z.string().trim().min(3).max(500),
});

export type ChangeSubscriptionStatusInput = z.input<
  typeof changeSubscriptionStatusInputSchema
>;

type SubscriptionRecord = {
  id: string;
  commercialClientId: string;
  tenantId: string | null;
  planCode: string;
  status: SubscriptionStatus;
  provisioningStatus: "pending" | "processing" | "completed" | "failed";
  activatedAt: Date | null;
  suspendedAt: Date | null;
  cancelledAt: Date | null;
};

type LifecycleTransaction = {
  findForUpdate(subscriptionId: string): Promise<SubscriptionRecord | null>;
  updateStatus(input: {
    subscription: SubscriptionRecord;
    targetStatus: ManageableSubscriptionStatus;
    changedAt: Date;
  }): Promise<SubscriptionRecord | null>;
  emitStatusChanged(input: {
    subscription: SubscriptionRecord;
    previousStatus: SubscriptionStatus;
    targetStatus: ManageableSubscriptionStatus;
    actor: { type: "user" | "agent" | "system" | "api"; id: string };
    reason: string;
    changedAt: Date;
  }): Promise<boolean>;
};

type LifecycleStore = {
  transaction<T>(callback: (tx: LifecycleTransaction) => Promise<T>): Promise<T>;
};

export type ChangeSubscriptionStatusResult =
  | {
      ok: true;
      replayed: boolean;
      subscription: {
        id: string;
        tenantId: string | null;
        previousStatus: SubscriptionStatus;
        status: SubscriptionStatus;
        provisioningStatus: SubscriptionRecord["provisioningStatus"];
        activatedAt: Date | null;
        suspendedAt: Date | null;
        cancelledAt: Date | null;
      };
      emittedEvents: ["commercial.subscription.status_changed"] | [];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "subscription_not_found"
        | "invalid_transition"
        | "provisioning_incomplete"
        | "concurrent_change";
      message: string;
    };

function successResult(input: {
  subscription: SubscriptionRecord;
  previousStatus: SubscriptionStatus;
  replayed: boolean;
  emitted: boolean;
}): ChangeSubscriptionStatusResult {
  return {
    ok: true,
    replayed: input.replayed,
    subscription: {
      id: input.subscription.id,
      tenantId: input.subscription.tenantId,
      previousStatus: input.previousStatus,
      status: input.subscription.status,
      provisioningStatus: input.subscription.provisioningStatus,
      activatedAt: input.subscription.activatedAt,
      suspendedAt: input.subscription.suspendedAt,
      cancelledAt: input.subscription.cancelledAt,
    },
    emittedEvents: input.emitted
      ? ["commercial.subscription.status_changed"]
      : [],
  };
}

export async function changeSubscriptionStatus(
  rawInput: ChangeSubscriptionStatusInput,
  options: { store?: LifecycleStore; now?: () => Date } = {},
): Promise<ChangeSubscriptionStatusResult> {
  const parsed = changeSubscriptionStatusInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados da transição inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleLifecycleStore();
  const changedAt = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const current = await tx.findForUpdate(input.subscriptionId);

    if (!current) {
      return {
        ok: false,
        error: "subscription_not_found",
        message: "A assinatura informada não foi encontrada.",
      };
    }

    if (current.status === input.targetStatus) {
      return successResult({
        subscription: current,
        previousStatus: current.status,
        replayed: true,
        emitted: false,
      });
    }

    if (!canTransitionSubscription(current.status, input.targetStatus)) {
      return {
        ok: false,
        error: "invalid_transition",
        message: `A assinatura não pode passar de ${current.status} para ${input.targetStatus}.`,
      };
    }

    if (
      input.targetStatus === "active" &&
      current.provisioningStatus !== "completed"
    ) {
      return {
        ok: false,
        error: "provisioning_incomplete",
        message: "A assinatura não pode ser ativada antes do provisionamento.",
      };
    }

    const updated = await tx.updateStatus({
      subscription: current,
      targetStatus: input.targetStatus,
      changedAt,
    });

    if (!updated) {
      return {
        ok: false,
        error: "concurrent_change",
        message: "A assinatura foi alterada por outra operação.",
      };
    }

    const emitted = await tx.emitStatusChanged({
      subscription: updated,
      previousStatus: current.status,
      targetStatus: input.targetStatus,
      actor: {
        type: input.actor.type,
        id: input.actor.id,
      },
      reason: input.reason,
      changedAt,
    });

    return successResult({
      subscription: updated,
      previousStatus: current.status,
      replayed: false,
      emitted,
    });
  });
}

function createDrizzleLifecycleStore(): LifecycleStore {
  const db = getDb();

  return {
    transaction: (callback) =>
      db.transaction(async (databaseTx) => {
        const selection = {
          id: subscriptions.id,
          commercialClientId: subscriptions.commercialClientId,
          tenantId: subscriptions.tenantId,
          planCode: subscriptions.planCode,
          status: subscriptions.status,
          provisioningStatus: subscriptions.provisioningStatus,
          activatedAt: subscriptions.activatedAt,
          suspendedAt: subscriptions.suspendedAt,
          cancelledAt: subscriptions.cancelledAt,
        };

        const tx: LifecycleTransaction = {
          async findForUpdate(subscriptionId) {
            const rows = await databaseTx
              .select(selection)
              .from(subscriptions)
              .where(eq(subscriptions.id, subscriptionId))
              .limit(1)
              .for("update");
            return rows[0] ?? null;
          },
          async updateStatus(values) {
            const timestampChanges = {
              active: {
                activatedAt:
                  values.subscription.activatedAt ?? values.changedAt,
                suspendedAt: null,
              },
              past_due: {},
              suspended: { suspendedAt: values.changedAt },
              cancelled: { cancelledAt: values.changedAt },
            } satisfies Record<
              ManageableSubscriptionStatus,
              Partial<typeof subscriptions.$inferInsert>
            >;

            const rows = await databaseTx
              .update(subscriptions)
              .set({
                status: values.targetStatus,
                ...timestampChanges[values.targetStatus],
                updatedAt: values.changedAt,
              })
              .where(
                and(
                  eq(subscriptions.id, values.subscription.id),
                  eq(subscriptions.status, values.subscription.status),
                ),
              )
              .returning(selection);
            return rows[0] ?? null;
          },
          async emitStatusChanged(values) {
            const dedupeKey = [
              "commercial.subscription.status_changed",
              values.subscription.id,
              values.previousStatus,
              values.targetStatus,
              values.changedAt.toISOString(),
            ].join(":");
            const rows = await databaseTx
              .insert(outbox)
              .values({
                aggregateType: "commercial_subscription",
                aggregateId: values.subscription.id,
                eventType: "commercial.subscription.status_changed",
                dedupeKey,
                payload: {
                  subscriptionId: values.subscription.id,
                  commercialClientId:
                    values.subscription.commercialClientId,
                  tenantId: values.subscription.tenantId,
                  planCode: values.subscription.planCode,
                  before: { status: values.previousStatus },
                  after: { status: values.targetStatus },
                  actor: values.actor,
                  reason: values.reason,
                  changedAt: values.changedAt.toISOString(),
                },
              })
              .onConflictDoNothing()
              .returning({ id: outbox.id });
            return Boolean(rows[0]);
          },
        };

        return callback(tx);
      }),
  };
}
