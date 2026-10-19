import crypto from "node:crypto";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { n8nAgentBookingCancellationStates, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { readDraftDecision } from "@/modules/conversation/AgentSchedulingDraft";
import type { N8nAgentShadowBookingCancellationProposal } from "./N8nAgentShadowMirrorResponse.schema";

const TTL_MS = 10 * 60 * 1000;
const senderKey = (companyId: string, whatsappAccountId: string, phone: string) => crypto.createHash("sha256").update(companyId + ":" + whatsappAccountId + ":" + normalizePhoneE164(phone)).digest("hex");

export async function persistN8nAgentBookingCancellationProposalAndPublish(input: { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; proposal: N8nAgentShadowBookingCancellationProposal; now?: Date }) {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.toPhone);
  return getDb().transaction(async tx => {
    await tx.update(n8nAgentBookingCancellationStates).set({ status: "superseded", updatedAt: now }).where(and(eq(n8nAgentBookingCancellationStates.companyId, input.companyId), eq(n8nAgentBookingCancellationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingCancellationStates.senderKey, identity), eq(n8nAgentBookingCancellationStates.status, "awaiting_confirmation")));
    await tx.insert(n8nAgentBookingCancellationStates).values({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, senderKey: identity, correlationId: input.correlationId, requestId: input.proposal.draft.requestId, appointmentId: input.proposal.draft.appointmentId, appointmentStatus: input.proposal.appointment.status, startsAt: new Date(input.proposal.appointment.startsAt), status: "awaiting_confirmation", expiresAt, createdAt: now, updatedAt: now }).onConflictDoNothing();
    await tx.insert(outbox).values({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", attempts: 0, dedupeKey: "wa_send:cancellation-proposal:" + input.correlationId, payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: input.proposal.text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_cancellation_proposal_v1", emittedAt: now.toISOString() } }, createdAt: now, updatedAt: now }).onConflictDoNothing();
    return { ok: true as const, expiresAt };
  });
}

export async function recordN8nAgentBookingCancellationDecision(input: { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; now?: Date }) {
  const decision = readDraftDecision(input.text);
  if (decision === "unknown") return { handled: false as const, reason: "not_confirmation" as const };
  const now = input.now ?? new Date();
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  return getDb().transaction(async tx => {
    const rows = await tx.select({ id: n8nAgentBookingCancellationStates.id }).from(n8nAgentBookingCancellationStates).where(and(eq(n8nAgentBookingCancellationStates.companyId, input.companyId), eq(n8nAgentBookingCancellationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingCancellationStates.senderKey, identity), eq(n8nAgentBookingCancellationStates.status, "awaiting_confirmation"), gt(n8nAgentBookingCancellationStates.expiresAt, now))).orderBy(desc(n8nAgentBookingCancellationStates.createdAt)).limit(1);
    const current = rows[0];
    if (!current) {
      if (decision !== "confirm") return { handled: false as const, reason: "confirmation_not_found" as const };
      const resumed = await tx.select({ id: n8nAgentBookingCancellationStates.id }).from(n8nAgentBookingCancellationStates).where(and(eq(n8nAgentBookingCancellationStates.companyId, input.companyId), eq(n8nAgentBookingCancellationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingCancellationStates.senderKey, identity), inArray(n8nAgentBookingCancellationStates.status, ["cancellation_pending", "execution_in_progress"]))).orderBy(desc(n8nAgentBookingCancellationStates.createdAt)).limit(1);
      return resumed[0] ? { handled: true as const, decision, stateId: resumed[0].id, resumed: true as const } : { handled: false as const, reason: "confirmation_not_found" as const };
    }
    const status = decision === "confirm" ? "cancellation_pending" : "rejected";
    const updated = await tx.update(n8nAgentBookingCancellationStates).set({ status, decidedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingCancellationStates.id, current.id), eq(n8nAgentBookingCancellationStates.status, "awaiting_confirmation"))).returning({ id: n8nAgentBookingCancellationStates.id });
    return updated[0] ? { handled: true as const, decision, stateId: updated[0].id } : { handled: false as const, reason: "confirmation_conflict" as const };
  });
}
