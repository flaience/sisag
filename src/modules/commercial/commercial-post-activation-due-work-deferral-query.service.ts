import { and, asc, desc, eq, gt, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationDueWorkItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { COMMERCIAL_POST_ACTIVATION_MAX_WAIT_SECONDS } from "./commercial-post-activation-due-work-deferral-policy.service";

const inputSchema = z.object({
  state: z.enum(["all", "waiting", "escalated"]).default("all"),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(100000).default(0),
});

const itemSchema = z.object({
  workId: z.string().uuid(),
  onboardingId: z.string().uuid(),
  milestoneCode: z.string().trim().min(1).max(100),
  status: z.enum(["scheduled", "processing", "failed"]),
  deferredCount: z.number().int().positive(),
  firstDeferredAt: z.string().datetime(),
  lastDeferredAt: z.string().datetime(),
  lastDeferralReason: z.enum([
    "business_wait",
    "deferral_limit_reached",
    "wait_deadline_reached",
  ]),
  escalationRequired: z.boolean(),
  availableAt: z.string().datetime(),
});

const storedSchema = z.object({
  total: z.number().int().nonnegative(),
  waiting: z.number().int().nonnegative(),
  escalated: z.number().int().nonnegative(),
  filteredTotal: z.number().int().nonnegative(),
  items: z.array(itemSchema),
});

type QueryInput = z.output<typeof inputSchema>;
type DeferralQueryStore = {
  read(input: QueryInput): Promise<unknown>;
};

export type ListCommercialPostActivationDueWorkDeferralsResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_snapshot";
      message: string;
    }
  | {
      ok: true;
      data: {
        recordedAt: string;
        status: "healthy" | "degraded" | "critical";
        total: number;
        waiting: number;
        escalated: number;
        filteredTotal: number;
        limit: number;
        offset: number;
        hasNext: boolean;
        items: Array<z.output<typeof itemSchema> & {
          waitAgeSeconds: number;
          waitDeadlineAt: string;
          waitRemainingSeconds: number;
          nextAvailableInSeconds: number;
        }>;
      };
    };

export async function listCommercialPostActivationDueWorkDeferrals(
  rawInput: unknown = {},
  options: {
    store?: DeferralQueryStore;
    now?: () => Date;
    maxWaitSeconds?: number;
  } = {},
): Promise<ListCommercialPostActivationDueWorkDeferralsResult> {
  const parsedInput = inputSchema.safeParse(rawInput);
  const maxWaitSeconds = options.maxWaitSeconds
    ?? COMMERCIAL_POST_ACTIVATION_MAX_WAIT_SECONDS;
  if (
    !parsedInput.success
    || !Number.isInteger(maxWaitSeconds)
    || maxWaitSeconds < 30
    || maxWaitSeconds > 2592000
  ) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Filtros para consulta dos adiamentos pós-ativação inválidos.",
    };
  }

  const input = parsedInput.data;
  const parsed = storedSchema.safeParse(
    await (options.store ?? createDrizzleDeferralQueryStore()).read(input),
  );
  if (
    !parsed.success
    || parsed.data.waiting + parsed.data.escalated !== parsed.data.total
    || parsed.data.items.length > input.limit
    || input.offset + parsed.data.items.length > parsed.data.filteredTotal
  ) {
    return {
      ok: false,
      error: "invalid_snapshot",
      message: "Os indicadores de adiamento pós-ativação são inconsistentes.",
    };
  }

  const now = options.now?.() ?? new Date();
  const items = parsed.data.items.map((item) => {
    const firstDeferredAt = new Date(item.firstDeferredAt);
    const availableAt = new Date(item.availableAt);
    const deadline = new Date(
      firstDeferredAt.getTime() + maxWaitSeconds * 1000,
    );
    return {
      ...item,
      waitAgeSeconds: elapsedSeconds(firstDeferredAt, now),
      waitDeadlineAt: deadline.toISOString(),
      waitRemainingSeconds: remainingSeconds(now, deadline),
      nextAvailableInSeconds: remainingSeconds(now, availableAt),
    };
  });

  return {
    ok: true,
    data: {
      recordedAt: now.toISOString(),
      status: parsed.data.escalated > 0
        ? "critical"
        : parsed.data.waiting > 0
          ? "degraded"
          : "healthy",
      total: parsed.data.total,
      waiting: parsed.data.waiting,
      escalated: parsed.data.escalated,
      filteredTotal: parsed.data.filteredTotal,
      limit: input.limit,
      offset: input.offset,
      hasNext: input.offset + items.length < parsed.data.filteredTotal,
      items,
    },
  };
}

function elapsedSeconds(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
}

function remainingSeconds(from: Date, to: Date) {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 1000));
}

function createDrizzleDeferralQueryStore(): DeferralQueryStore {
  const db = getDb();
  const table = commercialPostActivationDueWorkItems;
  const outstanding = and(ne(table.status, "completed"), gt(table.deferredCount, 0));
  return {
    async read(input) {
      const filtered = input.state === "all"
        ? outstanding
        : and(outstanding, eq(table.escalationRequired, input.state === "escalated"));
      const [summaryRows, filteredRows, rows] = await Promise.all([
        db.select({
          total: sql<number>`count(*)::int`,
          waiting: sql<number>`count(*) filter (where ${table.escalationRequired} = false)::int`,
          escalated: sql<number>`count(*) filter (where ${table.escalationRequired} = true)::int`,
        }).from(table).where(outstanding),
        db.select({ total: sql<number>`count(*)::int` })
          .from(table).where(filtered),
        db.select({
          workId: table.id,
          onboardingId: table.onboardingId,
          milestoneCode: table.milestoneCode,
          status: table.status,
          deferredCount: table.deferredCount,
          firstDeferredAt: table.firstDeferredAt,
          lastDeferredAt: table.lastDeferredAt,
          lastDeferralReason: table.lastDeferralReason,
          escalationRequired: table.escalationRequired,
          availableAt: table.availableAt,
        }).from(table).where(filtered)
          .orderBy(
            desc(table.escalationRequired),
            asc(table.firstDeferredAt),
            asc(table.id),
          )
          .limit(input.limit)
          .offset(input.offset),
      ]);
      return {
        total: Number(summaryRows[0]?.total ?? 0),
        waiting: Number(summaryRows[0]?.waiting ?? 0),
        escalated: Number(summaryRows[0]?.escalated ?? 0),
        filteredTotal: Number(filteredRows[0]?.total ?? 0),
        items: rows.map((item) => ({
          ...item,
          status: item.status,
          firstDeferredAt: item.firstDeferredAt?.toISOString(),
          lastDeferredAt: item.lastDeferredAt?.toISOString(),
          availableAt: item.availableAt.toISOString(),
        })),
      };
    },
  };
}
