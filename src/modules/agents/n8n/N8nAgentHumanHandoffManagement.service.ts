import { and, desc, eq, inArray, or } from "drizzle-orm";
import { clients, messageLogs, n8nAgentHumanHandoffStates } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import type { N8nAgentHumanHandoffAction } from "./N8nAgentHumanHandoffManagement.schema";

function validContactPhone(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizePhoneE164(value);
  return /^\+[1-9]\d{9,14}$/.test(normalized) ? normalized : null;
}

export const N8nAgentHumanHandoffManagementService = {
  async list(input: { companyId: string; status?: string | null; limit?: number }) {
    const limit = Math.max(1, Math.min(100, Math.trunc(input.limit ?? 30)));
    const status = input.status ?? "active";
    const statusFilter = status === "active"
      ? inArray(n8nAgentHumanHandoffStates.status, ["pending", "claimed"])
      : ["pending", "claimed", "resolved", "dismissed", "superseded"].includes(status)
        ? eq(n8nAgentHumanHandoffStates.status, status)
        : inArray(n8nAgentHumanHandoffStates.status, ["pending", "claimed"]);
    const db = getDb();
    const rows = await db.select({
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
      contactSource: messageLogs.toPhone,
    }).from(n8nAgentHumanHandoffStates).leftJoin(messageLogs, and(
      eq(messageLogs.companyId, n8nAgentHumanHandoffStates.companyId),
      eq(messageLogs.whatsappAccountId, n8nAgentHumanHandoffStates.whatsappAccountId),
      eq(messageLogs.providerMessageId, n8nAgentHumanHandoffStates.correlationId),
      eq(messageLogs.channel, "whatsapp"),
      eq(messageLogs.provider, "meta"),
      eq(messageLogs.status, "received"),
    )).where(and(eq(n8nAgentHumanHandoffStates.companyId, input.companyId), statusFilter)).orderBy(desc(n8nAgentHumanHandoffStates.createdAt)).limit(limit);

    const contactPhones = [...new Set(rows.map(row => validContactPhone(row.contactSource)).filter((value): value is string => value !== null))];
    const clientRows = contactPhones.length ? await db.select({
      id: clients.id,
      name: clients.name,
      phoneE164: clients.phoneE164,
    }).from(clients).where(and(eq(clients.companyId, input.companyId), inArray(clients.phoneE164, contactPhones))) : [];
    const clientByPhone = new Map(clientRows.map(client => [client.phoneE164, client]));

    return rows.map(({ contactSource, ...row }) => {
      const contactPhoneE164 = validContactPhone(contactSource);
      const client = contactPhoneE164 ? clientByPhone.get(contactPhoneE164) : undefined;
      return { ...row, clientId: client?.id ?? null, clientName: client?.name ?? null, contactPhoneE164 };
    });
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
