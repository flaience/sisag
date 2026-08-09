import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  commercialClients,
  commercialOnboardingSteps,
  commercialOnboardings,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const getCommercialOnboardingQueryInputSchema = z
  .object({
    onboardingId: z.string().uuid().optional(),
    commercialClientId: z.string().uuid().optional(),
  })
  .refine((value) => Boolean(value.onboardingId) !== Boolean(value.commercialClientId), {
    message: "Informe exatamente onboardingId ou commercialClientId.",
  });

export type GetCommercialOnboardingQueryInput = z.input<
  typeof getCommercialOnboardingQueryInputSchema
>;

type OnboardingStatus = "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
type StepStatus = "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled";
type Action = "start" | "complete" | "block" | "resume" | "skip" | "cancel";

type OnboardingView = {
  id: string;
  commercialClientId: string;
  status: OnboardingStatus;
  currentStepCode: string | null;
  blockedReason: string | null;
  input: unknown;
  result: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClientView = {
  id: string;
  legalName: string;
  tradeName: string | null;
  status: "prospect" | "onboarding" | "active" | "suspended" | "closed";
};

type StepView = {
  id: string;
  code: string;
  position: number;
  title: string;
  status: StepStatus;
  executorType: "human" | "agent" | "system" | "n8n";
  executorId: string | null;
  attempts: number;
  lastError: string | null;
  input: unknown;
  result: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
};

type QueryStore = {
  findOnboarding(input: { onboardingId?: string; commercialClientId?: string }): Promise<OnboardingView | null>;
  findClient(id: string): Promise<ClientView | null>;
  listSteps(onboardingId: string): Promise<StepView[]>;
};

export type GetCommercialOnboardingQueryResult =
  | {
      ok: true;
      data: {
        onboarding: OnboardingView;
        client: ClientView | null;
        progress: { total: number; completed: number; pending: number; percentage: number };
        currentStep: (StepView & { availableActions: Action[] }) | null;
        steps: Array<StepView & { isCurrent: boolean; availableActions: Action[] }>;
      };
    }
  | { ok: false; error: "invalid_input" | "onboarding_not_found"; message: string };

function availableActions(
  onboarding: OnboardingView,
  step: StepView,
  isCurrent: boolean,
): Action[] {
  if (onboarding.status === "completed" || onboarding.status === "cancelled") return [];
  if (!isCurrent) return [];
  if (step.status === "pending") return ["start", "skip", "cancel"];
  if (step.status === "in_progress") return ["complete", "block", "cancel"];
  if (step.status === "blocked") return ["resume", "skip", "cancel"];
  return [];
}

export async function getCommercialOnboardingQuery(
  rawInput: GetCommercialOnboardingQueryInput,
  options: { store?: QueryStore } = {},
): Promise<GetCommercialOnboardingQueryResult> {
  const parsed = getCommercialOnboardingQueryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Consulta de onboarding inválida.",
    };
  }

  const store = options.store ?? createDrizzleQueryStore();
  const onboarding = await store.findOnboarding(parsed.data);
  if (!onboarding) {
    return {
      ok: false,
      error: "onboarding_not_found",
      message: "O onboarding comercial informado não foi encontrado.",
    };
  }

  const [client, rawSteps] = await Promise.all([
    store.findClient(onboarding.commercialClientId),
    store.listSteps(onboarding.id),
  ]);
  const steps = rawSteps.map((step) => {
    const isCurrent = onboarding.currentStepCode === step.code;
    return { ...step, isCurrent, availableActions: availableActions(onboarding, step, isCurrent) };
  });
  const completed = steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
  const total = steps.length;
  const currentStep = steps.find((step) => step.isCurrent) ?? null;

  return {
    ok: true,
    data: {
      onboarding,
      client,
      progress: {
        total,
        completed,
        pending: total - completed,
        percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
      currentStep,
      steps,
    },
  };
}

function createDrizzleQueryStore(): QueryStore {
  const db = getDb();
  const onboardingSelection = {
    id: commercialOnboardings.id,
    commercialClientId: commercialOnboardings.commercialClientId,
    status: commercialOnboardings.status,
    currentStepCode: commercialOnboardings.currentStepCode,
    blockedReason: commercialOnboardings.blockedReason,
    input: commercialOnboardings.input,
    result: commercialOnboardings.result,
    startedAt: commercialOnboardings.startedAt,
    completedAt: commercialOnboardings.completedAt,
    cancelledAt: commercialOnboardings.cancelledAt,
    createdAt: commercialOnboardings.createdAt,
    updatedAt: commercialOnboardings.updatedAt,
  };
  return {
    async findOnboarding(input) {
      const condition = input.onboardingId
        ? eq(commercialOnboardings.id, input.onboardingId)
        : eq(commercialOnboardings.commercialClientId, input.commercialClientId!);
      const rows = await db.select(onboardingSelection).from(commercialOnboardings).where(condition).limit(1);
      return rows[0] ?? null;
    },
    async findClient(id) {
      const rows = await db
        .select({ id: commercialClients.id, legalName: commercialClients.legalName, tradeName: commercialClients.tradeName, status: commercialClients.status })
        .from(commercialClients)
        .where(eq(commercialClients.id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    async listSteps(onboardingId) {
      return db
        .select({
          id: commercialOnboardingSteps.id,
          code: commercialOnboardingSteps.code,
          position: commercialOnboardingSteps.position,
          title: commercialOnboardingSteps.title,
          status: commercialOnboardingSteps.status,
          executorType: commercialOnboardingSteps.executorType,
          executorId: commercialOnboardingSteps.executorId,
          attempts: commercialOnboardingSteps.attempts,
          lastError: commercialOnboardingSteps.lastError,
          input: commercialOnboardingSteps.input,
          result: commercialOnboardingSteps.result,
          startedAt: commercialOnboardingSteps.startedAt,
          completedAt: commercialOnboardingSteps.completedAt,
          updatedAt: commercialOnboardingSteps.updatedAt,
        })
        .from(commercialOnboardingSteps)
        .where(eq(commercialOnboardingSteps.onboardingId, onboardingId))
        .orderBy(asc(commercialOnboardingSteps.position));
    },
  };
}
