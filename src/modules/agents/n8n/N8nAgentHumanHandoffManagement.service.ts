import { and, desc, eq, inArray, or } from "drizzle-orm";
import { n8nAgentHumanHandoffStates } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { N8nAgentHumanHandoffAction } from "./N8nAgentHumanHandoffManagement.schema";

export const N8nAgentHumanHandoffManagementService = {
  async list(input: { companyId: string; status?: string | null; limit?: number }) {
    const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 30)));
    const status = input.status ?? "active";
    const statusFilter = status === "active"
      ? inArray(n8nAgentHumanHandoffStates.status, ["pending", "claimed"])
      : ["pending", "claimed", "resolved", "dismissed", "superseded"].includes(status)
        ? eq(n8nAgentHumanHandoffStates.status, status)
        : inArray(n8nAgentHumanHandoffStates.status, ["pending", "claimed"]);
    return getDb().select({
      id: n8nAgentHumanHandoffStates.id,
      whatsappAccountId: n8nAgentHumanHandoffStates.whatsappAccountId,
      correlationId: n8nAgentHumanHandoffStates.correlationId,
      reasonCode: n8nAgentHumanHandoffStates.reasonCode,
      confidenceMilli: n8nAgentHumanHandoffStates.confidenceMilli,
      status: n8nAgentHumanHandoffStates.status,
      claimedBy: n8nAgentHumanHandoffStates.claimedBy,
      claimedAt: n8nAgentHumanHandoffStates.claimedAt,
      resolvedBy: n8nAgentHumanHandoffStates.resolvedBy,
      resolvedAt: n8nAgentHumanHandoffStates.resolvedAt,
      createdAt: n8nAgentHumanHandoffStates.createdAt,
      updatedAt: n8nAgentHumanHandoffStates.updatedAt,
    }).from(n8nAgentHumanHandoffStates).where(and(eq(n8nAgentHumanHandoffStates.companyId, input.companyId), statusFilter)).orderBy(desc(n8nAgentHumanHandoffStates.createdAt)).limit(limit);
  },

  async apply(input: { companyId: string; actorId: string; command: N8nAgentHumanHandoffAction; now?: Date }) {
    const now = input.now ?? new Date();
    const db = getDb();
    const common = and(eq(n8nAgentHumanHandoffStates.id, input.command.id), eq(n8nAgentHumanHandoffStates.companyId, input.companyId));
    if (input.command.action === "claim") {
      const rows = await db.update(n8nAgentHumanHandoffStates).set({ status: "claimed", claimedBy: input.actorId, claimedAt: now, updatedAt: now }).where(and(common, eq(n8nAgentHumanHandoffStates.status, "pending"))).returning({ id: n8nAgentHumanHandoffStates.id, status: n8nAgentHumanHandoffStates.status });
      return rows[0] ? { ok: true as const, item: rows[0] } : { ok: false as const, error: "handoff_not_claimable" as const };
    }
    if (input.command.action === "resolve") {
      const rows = await db.update(n8nAgentHumanHandoffStates).set({ status: "resolved", resolvedBy: input.actorId, resolvedAt: now, updatedAt: now }).where(and(common, eq(n8nAgentHumanHandoffStates.status, "claimed"), eq(n8nAgentHumanHandoffStates.claimedBy, input.actorId))).returning({ id: n8nAgentHumanHandoffStates.id, status: n8nAgentHumanHandoffStates.status });
      return rows[0] ? { ok: true as const, item: rows[0] } : { ok: false as const, error: "handoff_not_resolvable" as const };
    }
    const dismissible = or(eq(n8nAgentHumanHandoffStates.status, "pending"), and(eq(n8nAgentHumanHandoffStates.status, "claimed"), eq(n8nAgentHumanHandoffStates.claimedBy, input.actorId)));
    const rows = await db.update(n8nAgentHumanHandoffStates).set({ status: "dismissed", resolvedBy: input.actorId, resolvedAt: now, updatedAt: now }).where(and(common, dismissible)).returning({ id: n8nAgentHumanHandoffStates.id, status: n8nAgentHumanHandoffStates.status });
    return rows[0] ? { ok: true as const, item: rows[0] } : { ok: false as const, error: "handoff_not_dismissible" as const };
  },
};