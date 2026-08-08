import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  commercialClients,
  outbox,
  subscriptions,
  subscriptionUsers,
  tenants,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const nullableText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const provisionCommercialAccountInputSchema = z.object({
  tenantId: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  legalName: z.string().trim().min(2).max(200),
  tradeName: nullableText,
  documentNumber: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 11 || value.length === 14, {
      message: "O documento deve conter 11 ou 14 dígitos.",
    }),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: nullableText,
  whatsapp: nullableText,
  planCode: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .default("standard"),
  trialDays: z.number().int().min(1).max(90).default(14),
});

export type ProvisionCommercialAccountInput = z.input<
  typeof provisionCommercialAccountInputSchema
>;

export type ProvisionCommercialAccountResult =
  | {
      ok: true;
      replayed: boolean;
      client: { id: string; status: "onboarding" | "active" };
      subscription: {
        id: string;
        tenantId: string;
        planCode: string;
        status: "trial" | "active";
        provisioningStatus: "completed";
      };
      owner: { userId: string; role: "owner"; isActive: true };
      emittedEvents: ["commercial.account.provisioned"] | [];
    }
  | {
      ok: false;
      error: "invalid_input" | "tenant_not_found" | "commercial_conflict";
      message: string;
    };

type ProvisioningStore = {
  transaction<T>(callback: (tx: ProvisioningTransaction) => Promise<T>): Promise<T>;
};

type ProvisioningTransaction = {
  tenantExists(tenantId: string): Promise<boolean>;
  findClientByDocument(documentNumber: string): Promise<ClientRecord | null>;
  createClient(input: {
    legalName: string;
    tradeName: string | null;
    documentNumber: string;
    email: string;
    phone: string | null;
    whatsapp: string | null;
  }): Promise<ClientRecord | null>;
  findSubscriptionByClient(clientId: string): Promise<SubscriptionRecord | null>;
  findSubscriptionByTenant(tenantId: string): Promise<SubscriptionRecord | null>;
  createSubscription(input: {
    clientId: string;
    tenantId: string;
    planCode: string;
    trialStartsAt: Date;
    trialEndsAt: Date;
  }): Promise<SubscriptionRecord | null>;
  ensureOwner(input: {
    clientId: string;
    userId: string;
    acceptedAt: Date;
  }): Promise<void>;
  emitProvisioned(input: {
    clientId: string;
    subscriptionId: string;
    tenantId: string;
    ownerUserId: string;
    planCode: string;
  }): Promise<boolean>;
};

type ClientRecord = {
  id: string;
  status: "prospect" | "onboarding" | "active" | "suspended" | "closed";
};

type SubscriptionRecord = {
  id: string;
  commercialClientId: string;
  tenantId: string | null;
  planCode: string;
  status: "pending" | "trial" | "active" | "past_due" | "suspended" | "cancelled";
  provisioningStatus: "pending" | "processing" | "completed" | "failed";
};

function commercialConflict(message: string): ProvisionCommercialAccountResult {
  return { ok: false, error: "commercial_conflict", message };
}

export async function provisionCommercialAccount(
  rawInput: ProvisionCommercialAccountInput,
  options: { store?: ProvisioningStore; now?: () => Date } = {},
): Promise<ProvisionCommercialAccountResult> {
  const parsed = provisionCommercialAccountInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados comerciais inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleProvisioningStore();
  const now = options.now?.() ?? new Date();
  const trialEndsAt = new Date(now.getTime() + input.trialDays * 86_400_000);

  return store.transaction(async (tx) => {
    if (!(await tx.tenantExists(input.tenantId))) {
      return {
        ok: false,
        error: "tenant_not_found",
        message: "O tenant informado não foi encontrado.",
      };
    }

    let client = await tx.findClientByDocument(input.documentNumber);
    const clientAlreadyExisted = Boolean(client);

    if (!client) {
      client = await tx.createClient({
        legalName: input.legalName,
        tradeName: input.tradeName,
        documentNumber: input.documentNumber,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
      });
      client ??= await tx.findClientByDocument(input.documentNumber);
    }

    if (!client) {
      return commercialConflict("Não foi possível reservar o cliente comercial.");
    }

    let subscription = await tx.findSubscriptionByClient(client.id);

    if (subscription?.tenantId && subscription.tenantId !== input.tenantId) {
      return commercialConflict(
        "O documento informado já está vinculado a outro tenant.",
      );
    }

    const tenantSubscription = await tx.findSubscriptionByTenant(input.tenantId);

    if (
      tenantSubscription &&
      tenantSubscription.commercialClientId !== client.id
    ) {
      return commercialConflict(
        "O tenant informado já está vinculado a outro cliente comercial.",
      );
    }

    subscription ??= tenantSubscription;

    if (!subscription) {
      subscription = await tx.createSubscription({
        clientId: client.id,
        tenantId: input.tenantId,
        planCode: input.planCode,
        trialStartsAt: now,
        trialEndsAt,
      });
      subscription ??= await tx.findSubscriptionByClient(client.id);
    }

    if (!subscription || subscription.tenantId !== input.tenantId) {
      return commercialConflict("Não foi possível reservar a assinatura comercial.");
    }

    await tx.ensureOwner({
      clientId: client.id,
      userId: input.ownerUserId,
      acceptedAt: now,
    });

    const emitted = await tx.emitProvisioned({
      clientId: client.id,
      subscriptionId: subscription.id,
      tenantId: input.tenantId,
      ownerUserId: input.ownerUserId,
      planCode: subscription.planCode,
    });

    return {
      ok: true,
      replayed: clientAlreadyExisted && !emitted,
      client: {
        id: client.id,
        status:
          client.status === "active" ? "active" : "onboarding",
      },
      subscription: {
        id: subscription.id,
        tenantId: input.tenantId,
        planCode: subscription.planCode,
        status: subscription.status === "active" ? "active" : "trial",
        provisioningStatus: "completed",
      },
      owner: {
        userId: input.ownerUserId,
        role: "owner",
        isActive: true,
      },
      emittedEvents: emitted ? ["commercial.account.provisioned"] : [],
    };
  });
}

function createDrizzleProvisioningStore(): ProvisioningStore {
  const db = getDb();

  return {
    transaction: (callback) =>
      db.transaction(async (databaseTx) => {
        const tx: ProvisioningTransaction = {
          async tenantExists(tenantId) {
            const rows = await databaseTx
              .select({ id: tenants.id })
              .from(tenants)
              .where(eq(tenants.id, tenantId))
              .limit(1);
            return Boolean(rows[0]);
          },
          async findClientByDocument(documentNumber) {
            const rows = await databaseTx
              .select({ id: commercialClients.id, status: commercialClients.status })
              .from(commercialClients)
              .where(eq(commercialClients.documentNumber, documentNumber))
              .limit(1);
            return rows[0] ?? null;
          },
          async createClient(values) {
            const rows = await databaseTx
              .insert(commercialClients)
              .values({ ...values, status: "onboarding" })
              .onConflictDoNothing()
              .returning({ id: commercialClients.id, status: commercialClients.status });
            return rows[0] ?? null;
          },
          async findSubscriptionByClient(clientId) {
            const rows = await databaseTx
              .select({
                id: subscriptions.id,
                commercialClientId: subscriptions.commercialClientId,
                tenantId: subscriptions.tenantId,
                planCode: subscriptions.planCode,
                status: subscriptions.status,
                provisioningStatus: subscriptions.provisioningStatus,
              })
              .from(subscriptions)
              .where(eq(subscriptions.commercialClientId, clientId))
              .limit(1);
            return rows[0] ?? null;
          },
          async findSubscriptionByTenant(tenantId) {
            const rows = await databaseTx
              .select({
                id: subscriptions.id,
                commercialClientId: subscriptions.commercialClientId,
                tenantId: subscriptions.tenantId,
                planCode: subscriptions.planCode,
                status: subscriptions.status,
                provisioningStatus: subscriptions.provisioningStatus,
              })
              .from(subscriptions)
              .where(eq(subscriptions.tenantId, tenantId))
              .limit(1);
            return rows[0] ?? null;
          },
          async createSubscription(values) {
            const rows = await databaseTx
              .insert(subscriptions)
              .values({
                commercialClientId: values.clientId,
                tenantId: values.tenantId,
                planCode: values.planCode,
                status: "trial",
                provisioningStatus: "completed",
                trialStartsAt: values.trialStartsAt,
                trialEndsAt: values.trialEndsAt,
                provisionedAt: values.trialStartsAt,
              })
              .onConflictDoNothing()
              .returning({
                id: subscriptions.id,
                commercialClientId: subscriptions.commercialClientId,
                tenantId: subscriptions.tenantId,
                planCode: subscriptions.planCode,
                status: subscriptions.status,
                provisioningStatus: subscriptions.provisioningStatus,
              });
            return rows[0] ?? null;
          },
          async ensureOwner(values) {
            await databaseTx
              .insert(subscriptionUsers)
              .values({
                commercialClientId: values.clientId,
                userId: values.userId,
                role: "owner",
                isActive: true,
                acceptedAt: values.acceptedAt,
              })
              .onConflictDoUpdate({
                target: [
                  subscriptionUsers.commercialClientId,
                  subscriptionUsers.userId,
                ],
                set: {
                  role: "owner",
                  isActive: true,
                  acceptedAt: values.acceptedAt,
                  updatedAt: values.acceptedAt,
                },
              });
          },
          async emitProvisioned(values) {
            const rows = await databaseTx
              .insert(outbox)
              .values({
                aggregateType: "commercial_subscription",
                aggregateId: values.subscriptionId,
                eventType: "commercial.account.provisioned",
                dedupeKey: `commercial.account.provisioned:${values.subscriptionId}`,
                payload: values,
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
