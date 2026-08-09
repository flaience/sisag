import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  commercialClients,
  commercialOnboardingSteps,
  commercialOnboardings,
  outbox,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const COMMERCIAL_ONBOARDING_STEPS = [
  {
    code: "validate_registration",
    position: 1,
    title: "Validação cadastral",
    executorType: "system",
  },
  {
    code: "configure_company",
    position: 2,
    title: "Configuração da empresa",
    executorType: "agent",
  },
  {
    code: "configure_scheduling",
    position: 3,
    title: "Configuração da agenda",
    executorType: "agent",
  },
  {
    code: "configure_team",
    position: 4,
    title: "Cadastro da equipe",
    executorType: "human",
  },
  {
    code: "configure_channels",
    position: 5,
    title: "Configuração dos canais",
    executorType: "agent",
  },
  {
    code: "training",
    position: 6,
    title: "Treinamento assistido",
    executorType: "agent",
  },
  {
    code: "go_live_validation",
    position: 7,
    title: "Validação de entrada em produção",
    executorType: "system",
  },
  {
    code: "complete_onboarding",
    position: 8,
    title: "Conclusão do onboarding",
    executorType: "system",
  },
] as const;

type OnboardingStepDefinition =
  (typeof COMMERCIAL_ONBOARDING_STEPS)[number];

export const initializeCommercialOnboardingInputSchema = z.object({
  commercialClientId: z.string().uuid(),
  actor: z.object({
    type: z.enum(["human", "agent", "system", "n8n"]),
    id: z.string().trim().min(1).max(200),
  }),
  reason: z.string().trim().min(3).max(500),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type InitializeCommercialOnboardingInput = z.input<
  typeof initializeCommercialOnboardingInputSchema
>;

type ClientRecord = {
  id: string;
  status: "prospect" | "onboarding" | "active" | "suspended" | "closed";
};

type OnboardingRecord = {
  id: string;
  commercialClientId: string;
  status: "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  currentStepCode: string | null;
  createdAt: Date;
};

type OnboardingTransaction = {
  findClientForUpdate(clientId: string): Promise<ClientRecord | null>;
  markClientOnboarding(clientId: string, changedAt: Date): Promise<void>;
  findByClient(clientId: string): Promise<OnboardingRecord | null>;
  createOnboarding(input: {
    clientId: string;
    currentStepCode: string;
    data: Record<string, unknown>;
    createdAt: Date;
  }): Promise<OnboardingRecord | null>;
  ensureSteps(input: {
    onboardingId: string;
    steps: readonly OnboardingStepDefinition[];
    createdAt: Date;
  }): Promise<number>;
  emitCreated(input: {
    onboarding: OnboardingRecord;
    actor: { type: "human" | "agent" | "system" | "n8n"; id: string };
    reason: string;
    steps: readonly OnboardingStepDefinition[];
    createdAt: Date;
  }): Promise<boolean>;
};

type OnboardingStore = {
  transaction<T>(callback: (tx: OnboardingTransaction) => Promise<T>): Promise<T>;
};

export type InitializeCommercialOnboardingResult =
  | {
      ok: true;
      replayed: boolean;
      reconciledSteps: number;
      onboarding: {
        id: string;
        commercialClientId: string;
        status: OnboardingRecord["status"];
        currentStepCode: string | null;
        totalSteps: number;
      };
      emittedEvents: ["commercial.onboarding.created"] | [];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "commercial_client_not_found"
        | "commercial_client_not_eligible"
        | "initialization_conflict";
      message: string;
    };

export async function initializeCommercialOnboarding(
  rawInput: InitializeCommercialOnboardingInput,
  options: { store?: OnboardingStore; now?: () => Date } = {},
): Promise<InitializeCommercialOnboardingResult> {
  const parsed = initializeCommercialOnboardingInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados do onboarding inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleOnboardingStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const client = await tx.findClientForUpdate(input.commercialClientId);

    if (!client) {
      return {
        ok: false,
        error: "commercial_client_not_found",
        message: "O cliente comercial informado não foi encontrado.",
      };
    }

    if (client.status === "suspended" || client.status === "closed") {
      return {
        ok: false,
        error: "commercial_client_not_eligible",
        message: `O cliente comercial em estado ${client.status} não pode iniciar onboarding.`,
      };
    }

    if (client.status === "prospect") {
      await tx.markClientOnboarding(client.id, now);
    }

    let onboarding = await tx.findByClient(client.id);
    const alreadyExisted = Boolean(onboarding);

    if (!onboarding) {
      onboarding = await tx.createOnboarding({
        clientId: client.id,
        currentStepCode: COMMERCIAL_ONBOARDING_STEPS[0].code,
        data: input.input,
        createdAt: now,
      });
      onboarding ??= await tx.findByClient(client.id);
    }

    if (!onboarding) {
      return {
        ok: false,
        error: "initialization_conflict",
        message: "Não foi possível reservar o onboarding comercial.",
      };
    }

    const reconciledSteps = await tx.ensureSteps({
      onboardingId: onboarding.id,
      steps: COMMERCIAL_ONBOARDING_STEPS,
      createdAt: now,
    });
    const emitted = await tx.emitCreated({
      onboarding,
      actor: { type: input.actor.type, id: input.actor.id },
      reason: input.reason,
      steps: COMMERCIAL_ONBOARDING_STEPS,
      createdAt: now,
    });

    return {
      ok: true,
      replayed: alreadyExisted && reconciledSteps === 0 && !emitted,
      reconciledSteps,
      onboarding: {
        id: onboarding.id,
        commercialClientId: onboarding.commercialClientId,
        status: onboarding.status,
        currentStepCode: onboarding.currentStepCode,
        totalSteps: COMMERCIAL_ONBOARDING_STEPS.length,
      },
      emittedEvents: emitted ? ["commercial.onboarding.created"] : [],
    };
  });
}

function createDrizzleOnboardingStore(): OnboardingStore {
  const db = getDb();

  return {
    transaction: (callback) =>
      db.transaction(async (databaseTx) => {
        const onboardingSelection = {
          id: commercialOnboardings.id,
          commercialClientId: commercialOnboardings.commercialClientId,
          status: commercialOnboardings.status,
          currentStepCode: commercialOnboardings.currentStepCode,
          createdAt: commercialOnboardings.createdAt,
        };
        const tx: OnboardingTransaction = {
          async findClientForUpdate(clientId) {
            const rows = await databaseTx
              .select({ id: commercialClients.id, status: commercialClients.status })
              .from(commercialClients)
              .where(eq(commercialClients.id, clientId))
              .limit(1)
              .for("update");
            return rows[0] ?? null;
          },
          async markClientOnboarding(clientId, changedAt) {
            await databaseTx
              .update(commercialClients)
              .set({ status: "onboarding", updatedAt: changedAt })
              .where(eq(commercialClients.id, clientId));
          },
          async findByClient(clientId) {
            const rows = await databaseTx
              .select(onboardingSelection)
              .from(commercialOnboardings)
              .where(eq(commercialOnboardings.commercialClientId, clientId))
              .limit(1);
            return rows[0] ?? null;
          },
          async createOnboarding(values) {
            const rows = await databaseTx
              .insert(commercialOnboardings)
              .values({
                commercialClientId: values.clientId,
                status: "pending",
                currentStepCode: values.currentStepCode,
                input: values.data,
                createdAt: values.createdAt,
                updatedAt: values.createdAt,
              })
              .onConflictDoNothing()
              .returning(onboardingSelection);
            return rows[0] ?? null;
          },
          async ensureSteps(values) {
            const rows = await databaseTx
              .insert(commercialOnboardingSteps)
              .values(
                values.steps.map((step) => ({
                  onboardingId: values.onboardingId,
                  code: step.code,
                  position: step.position,
                  title: step.title,
                  executorType: step.executorType,
                  status: "pending" as const,
                  createdAt: values.createdAt,
                  updatedAt: values.createdAt,
                })),
              )
              .onConflictDoNothing()
              .returning({ id: commercialOnboardingSteps.id });
            return rows.length;
          },
          async emitCreated(values) {
            const rows = await databaseTx
              .insert(outbox)
              .values({
                aggregateType: "commercial_onboarding",
                aggregateId: values.onboarding.id,
                eventType: "commercial.onboarding.created",
                dedupeKey: `commercial.onboarding.created:${values.onboarding.id}`,
                payload: {
                  onboardingId: values.onboarding.id,
                  commercialClientId: values.onboarding.commercialClientId,
                  actor: values.actor,
                  reason: values.reason,
                  steps: values.steps,
                  createdAt: values.createdAt.toISOString(),
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
