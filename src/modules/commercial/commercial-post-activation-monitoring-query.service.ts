import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialClients, commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  buildCommercialPostActivationMonitoring,
  type BuildCommercialPostActivationMonitoringResult,
  type CommercialPostActivationMonitoringStatus,
} from "./commercial-post-activation-monitoring.service";

const statusSchema = z.enum(["scheduled", "waiting", "overdue", "escalated", "completed"]);
const inputSchema = z.object({
  status: statusSchema.optional(),
  limit: z.number().int().positive().max(100).default(25),
});

type MonitoringView = Extract<
  BuildCommercialPostActivationMonitoringResult,
  { ok: true }
>["monitoring"];

type MonitoringCandidate = {
  onboardingId: string;
  commercialClientId: string;
  clientName: string;
  clientStatus: "prospect" | "onboarding" | "active" | "suspended" | "closed";
  result: Record<string, unknown>;
};

type MonitoringQueryStore = {
  listCandidates(limit: number): Promise<MonitoringCandidate[]>;
};

export type ListCommercialPostActivationMonitoringInput = {
  status?: CommercialPostActivationMonitoringStatus;
  limit?: number;
};

export type ListCommercialPostActivationMonitoringResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      data: {
        items: Array<{
          onboardingId: string;
          commercialClientId: string;
          clientName: string;
          clientStatus: MonitoringCandidate["clientStatus"];
          monitoring: MonitoringView;
        }>;
        summary: Record<CommercialPostActivationMonitoringStatus, number>;
        invalidRecords: number;
        failures: Array<{ onboardingId: string; error: string }>;
      };
    };

const priority: Record<CommercialPostActivationMonitoringStatus, number> = {
  escalated: 0,
  overdue: 1,
  waiting: 2,
  scheduled: 3,
  completed: 4,
};

export async function listCommercialPostActivationMonitoring(
  rawInput: ListCommercialPostActivationMonitoringInput = {},
  options: { store?: MonitoringQueryStore; now?: () => Date } = {},
): Promise<ListCommercialPostActivationMonitoringResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Consulta de monitoramento inválida.",
    };
  }

  const store = options.store ?? createDrizzleMonitoringQueryStore();
  const candidates = await store.listCandidates(100);
  const failures: Array<{ onboardingId: string; error: string }> = [];
  const items = candidates.flatMap((candidate) => {
    const built = buildCommercialPostActivationMonitoring({
      onboardingId: candidate.onboardingId,
      result: candidate.result,
    }, { now: options.now });
    if (built.ok === false) {
      failures.push({ onboardingId: candidate.onboardingId, error: built.error });
      return [];
    }
    return [{
      onboardingId: candidate.onboardingId,
      commercialClientId: candidate.commercialClientId,
      clientName: candidate.clientName,
      clientStatus: candidate.clientStatus,
      monitoring: built.monitoring,
    }];
  });

  items.sort((left, right) => {
    const byPriority = priority[left.monitoring.status] - priority[right.monitoring.status];
    if (byPriority) return byPriority;
    const leftDueAt = left.monitoring.currentMilestone?.dueAt ?? left.monitoring.supportWindowEndsAt;
    const rightDueAt = right.monitoring.currentMilestone?.dueAt ?? right.monitoring.supportWindowEndsAt;
    return new Date(leftDueAt).getTime() - new Date(rightDueAt).getTime();
  });
  const filtered = parsed.data.status
    ? items.filter((item) => item.monitoring.status === parsed.data.status)
    : items;
  const selected = filtered.slice(0, parsed.data.limit);
  const summary = selected.reduce<Record<CommercialPostActivationMonitoringStatus, number>>(
    (counts, item) => ({ ...counts, [item.monitoring.status]: counts[item.monitoring.status] + 1 }),
    { scheduled: 0, waiting: 0, overdue: 0, escalated: 0, completed: 0 },
  );

  return {
    ok: true,
    data: {
      items: selected,
      summary,
      invalidRecords: failures.length,
      failures,
    },
  };
}

function createDrizzleMonitoringQueryStore(): MonitoringQueryStore {
  const db = getDb();
  return {
    async listCandidates(limit) {
      const rows = await db.select({
        onboardingId: commercialOnboardings.id,
        commercialClientId: commercialClients.id,
        legalName: commercialClients.legalName,
        tradeName: commercialClients.tradeName,
        clientStatus: commercialClients.status,
        result: commercialOnboardings.result,
      }).from(commercialOnboardings)
        .innerJoin(commercialClients, eq(commercialClients.id, commercialOnboardings.commercialClientId))
        .where(sql`${commercialOnboardings.result} ? 'postActivationFollowUpPlan'`)
        .orderBy(desc(commercialOnboardings.updatedAt))
        .limit(limit);
      return rows.map((row) => ({
        onboardingId: row.onboardingId,
        commercialClientId: row.commercialClientId,
        clientName: row.tradeName?.trim() || row.legalName,
        clientStatus: row.clientStatus,
        result: (row.result ?? {}) as Record<string, unknown>,
      }));
    },
  };
}
