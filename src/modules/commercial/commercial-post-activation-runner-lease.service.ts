import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerLeases } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const runnerKeySchema = z.string().trim().min(1).max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);
const ownerKeySchema = z.string().trim().min(1).max(200);
const ttlSecondsSchema = z.number().int().min(30).max(3600).default(600);

const leaseInputSchema = z.object({
  runnerKey: runnerKeySchema.default("post_activation_due_runner"),
  ownerKey: ownerKeySchema,
  ttlSeconds: ttlSecondsSchema,
});
const releaseInputSchema = z.object({
  runnerKey: runnerKeySchema.default("post_activation_due_runner"),
  ownerKey: ownerKeySchema,
});

type RunnerLeaseStore = {
  acquire(input: {
    runnerKey: string;
    ownerKey: string;
    acquiredAt: Date;
    expiresAt: Date;
  }): Promise<boolean>;
  renew(input: {
    runnerKey: string;
    ownerKey: string;
    now: Date;
    expiresAt: Date;
  }): Promise<boolean>;
  release(input: { runnerKey: string; ownerKey: string }): Promise<boolean>;
};

type LeaseOptions = {
  store?: RunnerLeaseStore;
  now?: () => Date;
};

type LeaseFailure = {
  ok: false;
  error: "invalid_input";
  message: string;
};

export async function acquireCommercialPostActivationRunnerLease(
  rawInput: unknown,
  options: LeaseOptions = {},
): Promise<LeaseFailure | {
  ok: true;
  acquired: boolean;
  runnerKey: string;
  ownerKey?: string;
  expiresAt?: string;
}> {
  const parsed = leaseInputSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();

  const acquiredAt = options.now?.() ?? new Date();
  const expiresAt = addSeconds(acquiredAt, parsed.data.ttlSeconds);
  const acquired = await (options.store ?? createDrizzleRunnerLeaseStore()).acquire({
    runnerKey: parsed.data.runnerKey,
    ownerKey: parsed.data.ownerKey,
    acquiredAt,
    expiresAt,
  });
  if (!acquired) {
    return { ok: true, acquired: false, runnerKey: parsed.data.runnerKey };
  }
  return {
    ok: true,
    acquired: true,
    runnerKey: parsed.data.runnerKey,
    ownerKey: parsed.data.ownerKey,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function renewCommercialPostActivationRunnerLease(
  rawInput: unknown,
  options: LeaseOptions = {},
): Promise<LeaseFailure | {
  ok: true;
  renewed: boolean;
  runnerKey: string;
  ownerKey?: string;
  expiresAt?: string;
}> {
  const parsed = leaseInputSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();

  const now = options.now?.() ?? new Date();
  const expiresAt = addSeconds(now, parsed.data.ttlSeconds);
  const renewed = await (options.store ?? createDrizzleRunnerLeaseStore()).renew({
    runnerKey: parsed.data.runnerKey,
    ownerKey: parsed.data.ownerKey,
    now,
    expiresAt,
  });
  if (!renewed) {
    return { ok: true, renewed: false, runnerKey: parsed.data.runnerKey };
  }
  return {
    ok: true,
    renewed: true,
    runnerKey: parsed.data.runnerKey,
    ownerKey: parsed.data.ownerKey,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function releaseCommercialPostActivationRunnerLease(
  rawInput: unknown,
  options: Pick<LeaseOptions, "store"> = {},
): Promise<LeaseFailure | { ok: true; released: boolean; runnerKey: string }> {
  const parsed = releaseInputSchema.safeParse(rawInput);
  if (!parsed.success) return invalidInput();
  const runnerKey = parsed.data.runnerKey;
  const ownerKey = parsed.data.ownerKey;
  if (!runnerKey || !ownerKey) return invalidInput();
  const released = await (options.store ?? createDrizzleRunnerLeaseStore()).release({
    runnerKey,
    ownerKey,
  });
  return { ok: true, released, runnerKey };
}

function invalidInput(): LeaseFailure {
  return {
    ok: false,
    error: "invalid_input",
    message: "Identidade ou duração da lease do runner inválida.",
  };
}

function addSeconds(value: Date, seconds: number) {
  return new Date(value.getTime() + seconds * 1000);
}

function createDrizzleRunnerLeaseStore(): RunnerLeaseStore {
  const db = getDb();
  return {
    async acquire(input) {
      const rows = await db.insert(commercialPostActivationRunnerLeases).values({
        runnerKey: input.runnerKey,
        ownerKey: input.ownerKey,
        acquiredAt: input.acquiredAt,
        expiresAt: input.expiresAt,
        updatedAt: input.acquiredAt,
      }).onConflictDoUpdate({
        target: commercialPostActivationRunnerLeases.runnerKey,
        set: {
          ownerKey: input.ownerKey,
          acquiredAt: input.acquiredAt,
          expiresAt: input.expiresAt,
          updatedAt: input.acquiredAt,
        },
        setWhere: sql`${commercialPostActivationRunnerLeases.expiresAt} <= ${input.acquiredAt}
          OR ${commercialPostActivationRunnerLeases.ownerKey} = ${input.ownerKey}`,
      }).returning({ runnerKey: commercialPostActivationRunnerLeases.runnerKey });
      return Boolean(rows[0]);
    },
    async renew(input) {
      const rows = await db.update(commercialPostActivationRunnerLeases).set({
        expiresAt: input.expiresAt,
        updatedAt: input.now,
      }).where(and(
        eq(commercialPostActivationRunnerLeases.runnerKey, input.runnerKey),
        eq(commercialPostActivationRunnerLeases.ownerKey, input.ownerKey),
        gt(commercialPostActivationRunnerLeases.expiresAt, input.now),
      )).returning({ runnerKey: commercialPostActivationRunnerLeases.runnerKey });
      return Boolean(rows[0]);
    },
    async release(input) {
      const rows = await db.delete(commercialPostActivationRunnerLeases).where(and(
        eq(commercialPostActivationRunnerLeases.runnerKey, input.runnerKey),
        eq(commercialPostActivationRunnerLeases.ownerKey, input.ownerKey),
      )).returning({ runnerKey: commercialPostActivationRunnerLeases.runnerKey });
      return Boolean(rows[0]);
    },
  };
}
