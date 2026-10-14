import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { n8nAgentHumanHandoffStates } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";

export const N8N_AGENT_ACTIVE_HANDOFF_STATUSES = ["pending", "claimed"] as const;

export function deriveN8nAgentHandoffSenderKey(companyId: string, whatsappAccountId: string, phone: string) {
  return crypto.createHash("sha256").update(`${companyId}:${whatsappAccountId}:${normalizePhoneE164(phone)}`).digest("hex");
}

export function isN8nAgentHandoffStatusSuspended(status: string) {
  return (N8N_AGENT_ACTIVE_HANDOFF_STATUSES as readonly string[]).includes(status);
}

export async function persistN8nAgentHumanHandoffState(input: {
  companyId: string;
  whatsappAccountId: string;
  senderPhoneE164: string;
  correlationId: string;
  reasonCode: string;
  confidence?: number | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const senderKey = deriveN8nAgentHandoffSenderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  const confidenceMilli = input.confidence == null ? null : Math.max(0, Math.min(1000, Math.round(input.confidence * 1000)));
  return getDb().transaction(async tx => {
    await tx.update(n8nAgentHumanHandoffStates).set({ status: "superseded", updatedAt: now }).where(and(
      eq(n8nAgentHumanHandoffStates.companyId, input.companyId),
      eq(n8nAgentHumanHandoffStates.whatsappAccountId, input.whatsappAccountId),
      eq(n8nAgentHumanHandoffStates.senderKey, senderKey),
      eq(n8nAgentHumanHandoffStates.status, "pending"),
    ));
    const rows = await tx.insert(n8nAgentHumanHandoffStates).values({
      companyId: input.companyId,
      whatsappAccountId: input.whatsappAccountId,
      senderKey,
      correlationId: input.correlationId,
      reasonCode: input.reasonCode,
      confidenceMilli,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().returning({ id: n8nAgentHumanHandoffStates.id });
    return rows[0] ? { created: true as const, id: rows[0].id } : { created: false as const, reason: "duplicate_correlation" as const };
  });
}

export async function isN8nAgentConversationSuspended(input: { companyId: string; whatsappAccountId: string; senderPhoneE164: string }) {
  const senderKey = deriveN8nAgentHandoffSenderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  const rows = await getDb().select({ status: n8nAgentHumanHandoffStates.status }).from(n8nAgentHumanHandoffStates).where(and(
    eq(n8nAgentHumanHandoffStates.companyId, input.companyId),
    eq(n8nAgentHumanHandoffStates.whatsappAccountId, input.whatsappAccountId),
    eq(n8nAgentHumanHandoffStates.senderKey, senderKey),
    inArray(n8nAgentHumanHandoffStates.status, [...N8N_AGENT_ACTIVE_HANDOFF_STATUSES]),
  )).orderBy(desc(n8nAgentHumanHandoffStates.createdAt)).limit(1);
  return rows.length > 0;
}