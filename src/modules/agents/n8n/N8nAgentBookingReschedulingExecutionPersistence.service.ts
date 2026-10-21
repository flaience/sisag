import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { n8nAgentBookingReschedulingStates, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { formatPtBr } from "@/lib/time";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter";
import type { AppointmentSummary, SchedulingOperationResult } from "@/platform/capabilities/scheduling/operations";
import { executeConfirmedN8nAgentBookingRescheduling, type ConfirmedBookingReschedulingState } from "./N8nAgentBookingReschedulingExecution";
type ReschedulingResult = SchedulingOperationResult<AppointmentSummary>;
const db = () => getDb();
const senderKey = (companyId: string, whatsappAccountId: string, phone: string) => crypto.createHash("sha256").update(companyId + ":" + whatsappAccountId + ":" + normalizePhoneE164(phone)).digest("hex");

async function load(input: { stateId: string; companyId: string; whatsappAccountId: string; senderPhoneE164: string }): Promise<ConfirmedBookingReschedulingState | null> {
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  const [state] = await db().select().from(n8nAgentBookingReschedulingStates).where(and(eq(n8nAgentBookingReschedulingStates.id, input.stateId), eq(n8nAgentBookingReschedulingStates.companyId, input.companyId), eq(n8nAgentBookingReschedulingStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingReschedulingStates.senderKey, identity))).limit(1);
  if (!state || (state.status !== "rescheduling_pending" && state.status !== "execution_in_progress")) return null;
  return { id: state.id, companyId: state.companyId, appointmentId: state.appointmentId, currentStartsAt: state.currentStartsAt, newStartsAt: state.newStartsAt, newEndsAt: state.newEndsAt, status: state.status };
}
async function claim(stateId: string) { const now = new Date(); const rows = await db().update(n8nAgentBookingReschedulingStates).set({ status: "execution_in_progress", executionStartedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingReschedulingStates.id, stateId), eq(n8nAgentBookingReschedulingStates.status, "rescheduling_pending"))).returning({ id: n8nAgentBookingReschedulingStates.id }); return Boolean(rows[0]); }
async function reschedule(input: { companyId: string; appointmentId: string; startsAt: string; endsAt: string; correlationId: string; reason: string }): Promise<ReschedulingResult> { return new SisagSchedulingAdapter().rescheduleAppointment({ companyId: input.companyId, actor: { type: "agent", id: "n8n-agent" }, correlationId: input.correlationId }, { appointmentId: input.appointmentId, startsAt: input.startsAt, endsAt: input.endsAt, reason: input.reason }); }
async function complete(input: { state: ConfirmedBookingReschedulingState; toPhone: string; correlationId: string; result: ReschedulingResult }) {
  const now = new Date(); const success = input.result.ok === true && input.result.data?.startsAt === input.state.newStartsAt.toISOString();
  const error = success ? null : input.result.error?.code ?? "SCHEDULING_UNKNOWN_ERROR";
  const slotFailure = error === "SCHEDULING_SLOT_NOT_AVAILABLE";
  const definitiveFailure = error === "SCHEDULING_OPERATION_NOT_ALLOWED" || error === "SCHEDULING_APPOINTMENT_NOT_FOUND" || error === "SCHEDULING_RESOURCE_NOT_FOUND" || error === "SCHEDULING_SERVICE_NOT_FOUND";
  const status = success ? "completed" : slotFailure ? "failed_slot_unavailable" : definitiveFailure ? "failed_not_reschedulable" : "execution_uncertain";
  const text = success ? "Agendamento remarcado ✅\n📅 " + formatPtBr(input.state.newStartsAt.toISOString()) : slotFailure ? "Esse horário acabou de ficar indisponível. Seu agendamento original não foi alterado." : definitiveFailure ? "Não foi possível remarcar porque o agendamento não está mais disponível para alteração." : "Não consegui confirmar a remarcação agora. Não repetirei a operação até concluir a verificação.";
  await db().transaction(async tx => { await tx.update(n8nAgentBookingReschedulingStates).set({ status, executionErrorCode: error, executionCompletedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingReschedulingStates.id, input.state.id), eq(n8nAgentBookingReschedulingStates.status, "execution_in_progress"))); await tx.insert(outbox).values({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", attempts: 0, dedupeKey: "wa_send:rescheduling-result:" + input.state.id, payload: { companyId: input.state.companyId, toPhone: normalizePhoneE164(input.toPhone), text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_rescheduling_execution_v1", emittedAt: now.toISOString() } }, createdAt: now, updatedAt: now }).onConflictDoNothing(); });
}
type Input = { stateId: string; companyId: string; whatsappAccountId: string; senderPhoneE164: string; correlationId: string };
type Dependencies = { load: typeof load; claim: typeof claim; reschedule: typeof reschedule; complete: typeof complete };
export async function executePersistedN8nAgentBookingRescheduling(input: Input, dependencies: Dependencies = { load, claim, reschedule, complete }) { const state = await dependencies.load(input); if (!state) return { executed: false as const, reason: "state_not_found" as const }; return executeConfirmedN8nAgentBookingRescheduling(state, { claim: dependencies.claim, reschedule: dependencies.reschedule, complete: (stateId, result) => dependencies.complete({ state: { ...state, id: stateId }, toPhone: input.senderPhoneE164, correlationId: input.correlationId, result }) }); }
