import { eq } from "drizzle-orm";

import {
  companies,
  schedulingConfig,
  subscriptions,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import {
  SchedulingConfigInputSchema,
  type SchedulingConfigInput,
} from "@/modules/scheduling-config/scheduling-config.schema";

import type {
  CommercialOnboardingRuntimeAdapter,
  CommercialOnboardingRuntimeAdapterResult,
} from "./commercial-onboarding-runtime-executor.service";

type Command = Parameters<CommercialOnboardingRuntimeAdapter["execute"]>[0];

type SchedulingTarget = {
  tenantId: string;
  companyId: string;
};

type SchedulingStore = {
  findTarget(commercialClientId: string): Promise<SchedulingTarget | null>;
  saveConfig(
    companyId: string,
    config: SchedulingConfigInput,
  ): Promise<{ id: string } | null>;
};

const defaultConfig: SchedulingConfigInput = {
  timezone: "America/Sao_Paulo",
  slotDurationMinutes: 15,
  bufferMinutes: 5,
  allowOverbooking: false,
  maxAdvanceDays: 30,
  minCancelAdvanceMinutes: 0,
};

function resolveConfig(input: Record<string, unknown>) {
  const requested =
    typeof input.schedulingConfig === "object" &&
    input.schedulingConfig !== null &&
    !Array.isArray(input.schedulingConfig)
      ? input.schedulingConfig
      : {};

  return SchedulingConfigInputSchema.safeParse({
    ...defaultConfig,
    ...requested,
  });
}

export function createCommercialOnboardingSchedulingAdapter(
  options: { store?: SchedulingStore } = {},
): CommercialOnboardingRuntimeAdapter {
  const store = options.store ?? createDrizzleSchedulingStore();

  return {
    id: "commercial-onboarding-scheduling-agent",

    async execute(command: Command): Promise<CommercialOnboardingRuntimeAdapterResult> {
      if (
        command.stepCode !== "configure_scheduling" ||
        command.executorType !== "agent"
      ) {
        return {
          outcome: "failed",
          reason: "O adaptador de agenda recebeu uma etapa incompatível.",
          error: "unsupported_scheduling_command",
        };
      }

      const parsedConfig = resolveConfig(command.input);
      if (!parsedConfig.success) {
        return {
          outcome: "human_required",
          reason: "A configuração de agenda informada precisa ser revisada.",
          error:
            parsedConfig.error.issues[0]?.message ??
            "invalid_scheduling_configuration",
        };
      }

      const target = await store.findTarget(command.commercialClientId);
      if (!target) {
        return {
          outcome: "blocked",
          reason:
            "Não foi possível localizar a empresa vinculada à assinatura comercial.",
          error: "commercial_company_not_found",
        };
      }

      const saved = await store.saveConfig(target.companyId, parsedConfig.data);
      if (!saved) {
        return {
          outcome: "failed",
          reason: "A configuração de agenda não pôde ser persistida.",
          error: "scheduling_configuration_not_saved",
        };
      }

      return {
        outcome: "completed",
        reason: "Configuração inicial da agenda validada e aplicada.",
        result: {
          schedulingConfigId: saved.id,
          tenantId: target.tenantId,
          companyId: target.companyId,
          configuration: parsedConfig.data,
        },
      };
    },
  };
}

function createDrizzleSchedulingStore(): SchedulingStore {
  const db = getDb();

  return {
    async findTarget(commercialClientId) {
      const rows = await db
        .select({
          tenantId: subscriptions.tenantId,
          companyId: companies.id,
        })
        .from(subscriptions)
        .innerJoin(companies, eq(companies.tenantId, subscriptions.tenantId))
        .where(eq(subscriptions.commercialClientId, commercialClientId))
        .limit(1);

      const row = rows[0];
      return row?.tenantId && row.companyId
        ? { tenantId: row.tenantId, companyId: row.companyId }
        : null;
    },

    async saveConfig(companyId, config) {
      const rows = await db
        .insert(schedulingConfig)
        .values({ companyId, ...config })
        .onConflictDoUpdate({
          target: schedulingConfig.companyId,
          set: { ...config, updatedAt: new Date() },
        })
        .returning({ id: schedulingConfig.id });

      return rows[0] ?? null;
    },
  };
}
