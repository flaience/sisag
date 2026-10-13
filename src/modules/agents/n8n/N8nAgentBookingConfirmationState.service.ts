import crypto from "node:crypto";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { n8nAgentBookingConfirmationStates, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { readDraftDecision } from "@/modules/conversation/AgentSchedulingDraft";
import type { N8nAgentShadowBookingConfirmationProposal } from "./N8nAgentShadowMirrorResponse.schema";

const TTL_MS = 10 * 60 * 1000;
const senderKey = (companyId: string, whatsappAccountId: string, phone: string) => crypto.createHash("sha256").update(companyId + ":" + whatsappAccountId + ":" + normalizePhoneE164(phone)).digest("hex");

export async function persistN8nAgentBookingProposalAndPublish(input: { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; proposal: N8nAgentShadowBookingConfirmationProposal; now?: Date }) {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.toPhone);
  return getDb().transaction(async tx => {
    await tx.update(n8nAgentBookingConfirmationStates).set({ status: "superseded", updatedAt: now }).where(and(eq(n8nAgentBookingConfirmationStates.companyId, input.companyId), eq(n8nAgentBookingConfirmationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingConfirmationStates.senderKey, identity), eq(n8nAgentBookingConfirmationStates.status, "awaiting_confirmation")));
    await tx.insert(n8nAgentBookingConfirmationStates).values({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, senderKey: identity, correlationId: input.correlationId, requestId: input.proposal.draft.requestId, serviceId: input.proposal.draft.serviceId, professionalId: input.proposal.selectedSlot.professionalId ?? null, unitId: input.proposal.selectedSlot.unitId ?? null, startsAt: new Date(input.proposal.selectedSlot.startsAt), endsAt: new Date(input.proposal.selectedSlot.endsAt), status: "awaiting_confirmation", expiresAt, createdAt: now, updatedAt: now }).onConflictDoNothing();
    await tx.insert(outbox).values({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", attempts: 0, dedupeKey: `wa_send:${input.correlationId}`, payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: input.proposal.text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_proposal_v1", emittedAt: now.toISOString() } }, createdAt: now, updatedAt: now }).onConflictDoNothing();
    return { ok: true as const, expiresAt };
  });
}

export async function recordN8nAgentBookingConfirmationDecision(input: { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; now?: Date }) {
  const decision = readDraftDecision(input.text);
  if (decision === "unknown") return { handled: false as const, reason: "not_confirmation" as const };
  const now = input.now ?? new Date();
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  return getDb().transaction(async tx => {
    const rows = await tx.select({ id: n8nAgentBookingConfirmationStates.id }).from(n8nAgentBookingConfirmationStates).where(and(eq(n8nAgentBookingConfirmationStates.companyId, input.companyId), eq(n8nAgentBookingConfirmationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingConfirmationStates.senderKey, identity), eq(n8nAgentBookingConfirmationStates.status, "awaiting_confirmation"), gt(n8nAgentBookingConfirmationStates.expiresAt, now))).orderBy(desc(n8nAgentBookingConfirmationStates.createdAt)).limit(1);
    const current = rows[0];
    if (!current) {
      if (decision !== "confirm") return { handled: false as const, reason: "confirmation_not_found" as const };
      const resumed = await tx.select({ id: n8nAgentBookingConfirmationStates.id }).from(n8nAgentBookingConfirmationStates).where(and(eq(n8nAgentBookingConfirmationStates.companyId, input.companyId), eq(n8nAgentBookingConfirmationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingConfirmationStates.senderKey, identity), inArray(n8nAgentBookingConfirmationStates.status, ["confirmed_pending_execution", "execution_in_progress"]))).orderBy(desc(n8nAgentBookingConfirmationStates.createdAt)).limit(1);
      return resumed[0] ? { handled: true as const, decision, stateId: resumed[0].id, resumed: true as const } : { handled: false as const, reason: "confirmation_not_found" as const };
    }
    const status = decision === "confirm" ? "confirmed_pending_execution" : "rejected";
    const updated = await tx.update(n8nAgentBookingConfirmationStates).set({ status, decidedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingConfirmationStates.id, current.id), eq(n8nAgentBookingConfirmationStates.status, "awaiting_confirmation"))).returning({ id: n8nAgentBookingConfirmationStates.id });
    return updated[0] ? { handled: true as const, decision, stateId: updated[0].id } : { handled: false as const, reason: "confirmation_conflict" as const };
  });
}
