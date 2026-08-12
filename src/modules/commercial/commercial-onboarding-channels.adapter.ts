import { eq } from "drizzle-orm";

import { companies, subscriptions, whatsappAccounts } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import type {
  CommercialOnboardingRuntimeAdapter,
  CommercialOnboardingRuntimeAdapterResult,
} from "./commercial-onboarding-runtime-executor.service";

type Command = Parameters<CommercialOnboardingRuntimeAdapter["execute"]>[0];

type ChannelTarget = {
  tenantId: string;
  companyId: string;
};

type ChannelAccount = {
  id: string;
  provider: string;
  status: string;
};

type ChannelStore = {
  findTarget(commercialClientId: string): Promise<ChannelTarget | null>;
  listAccounts(companyId: string): Promise<ChannelAccount[]>;
};

function normalizeAccounts(accounts: ChannelAccount[]) {
  return accounts.map((account) => ({
    id: account.id,
    provider: account.provider.trim().toLowerCase(),
    status: account.status.trim().toLowerCase(),
  }));
}

export function createCommercialOnboardingChannelsAdapter(
  options: { store?: ChannelStore } = {},
): CommercialOnboardingRuntimeAdapter {
  const store = options.store ?? createDrizzleChannelStore();

  return {
    id: "commercial-onboarding-channels-agent",

    async execute(command: Command): Promise<CommercialOnboardingRuntimeAdapterResult> {
      if (
        command.stepCode !== "configure_channels" ||
        command.executorType !== "agent"
      ) {
        return {
          outcome: "failed",
          reason: "O adaptador de canais recebeu uma etapa incompatível.",
          error: "unsupported_channels_command",
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

      const accounts = normalizeAccounts(await store.listAccounts(target.companyId));
      const activeAccounts = accounts.filter((account) => account.status === "active");

      if (activeAccounts.length === 0) {
        return {
          outcome: "human_required",
          reason:
            "Nenhum canal de WhatsApp ativo foi encontrado para a empresa.",
          error: "active_whatsapp_channel_required",
          result: {
            tenantId: target.tenantId,
            companyId: target.companyId,
            configuredChannels: accounts,
            requiredAction: "activate_whatsapp_channel",
          },
        };
      }

      return {
        outcome: "completed",
        reason: "Os canais ativos da empresa foram localizados e validados.",
        result: {
          tenantId: target.tenantId,
          companyId: target.companyId,
          configuredChannels: activeAccounts,
          activeChannelCount: activeAccounts.length,
        },
      };
    },
  };
}

function createDrizzleChannelStore(): ChannelStore {
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

    async listAccounts(companyId) {
      return db
        .select({
          id: whatsappAccounts.id,
          provider: whatsappAccounts.provider,
          status: whatsappAccounts.status,
        })
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.companyId, companyId));
    },
  };
}
