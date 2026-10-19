import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { n8nAgentBookingCancellationStates, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { formatPtBr } from "@/lib/time";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter";
import type { AppointmentSummary, SchedulingOperationResult } from "@/platform/capabilities/scheduling/operations";
import { executeConfirmedN8nAgentBookingCancellation, type ConfirmedBookingCancellationState } from "./N8nAgentBookingCancellationExecution";

type CancellationResult = SchedulingOperationResult<AppointmentSummary>;
const db = () => getDb();
const senderKey = (companyId: string, whatsappAccountId: string, phone: string) => crypto.createHash("sha256").update(companyId + ":" + whatsappAccountId + ":" + normalizePhoneE164(phone)).digest("hex");

async function load(input: { stateId: string; companyId: string; whatsappAccountId: string; senderPhoneE164: string }): Promise<ConfirmedBookingCancellationState | null> {
  const identity = senderKey(input.companyId, input.whatsappAccountId, input.senderPhoneE164);
  const [state] = await db().select().from(n8nAgentBookingCancellationStates).where(and(eq(n8nAgentBookingCancellationStates.id, input.stateId), eq(n8nAgentBookingCancellationStates.companyId, input.companyId), eq(n8nAgentBookingCancellationStates.whatsappAccountId, input.whatsappAccountId), eq(n8nAgentBookingCancellationStates.senderKey, identity))).limit(1);
  if (!state || (state.status !== "cancellation_pending" && state.status !== "execution_in_progress")) return null;
  return { id: state.id, companyId: state.companyId, appointmentId: state.appointmentId, startsAt: state.startsAt, status: state.status };
}

async function claim(stateId: string) {
  const now = new Date();
  const rows = await db().update(n8nAgentBookingCancellationStates).set({ status: "execution_in_progress", executionStartedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingCancellationStates.id, stateId), eq(n8nAgentBookingCancellationStates.status, "cancellation_pending"))).returning({ id: n8nAgentBookingCancellationStates.id });
  return Boolean(rows[0]);
}

async function cancel(input: { companyId: string; appointmentId: string; correlationId: string; reason: string }): Promise<CancellationResult> {
  return new SisagSchedulingAdapter().cancelAppointment({ companyId: input.companyId, actor: { type: "agent", id: "n8n-agent" }, correlationId: input.correlationId }, { appointmentId: input.appointmentId, reason: input.reason });
}

async function complete(input: { state: ConfirmedBookingCancellationState; toPhone: string; correlationId: string; result: CancellationResult }) {
  const now = new Date();
  const success = input.result.ok === true && input.result.data?.state === "cancelled";
  const error = success ? null : input.result.error?.code ?? "SCHEDULING_UNKNOWN_ERROR";
  const definitiveFailure = error === "SCHEDULING_OPERATION_NOT_ALLOWED" || error === "SCHEDULING_APPOINTMENT_NOT_FOUND";
  const status = success ? "completed" : definitiveFailure ? "failed_not_cancellable" : "execution_uncertain";
  const text = success ? "Agendamento cancelado ✅\n📅 " + formatPtBr(input.state.startsAt.toISOString()) : definitiveFailure ? "Não foi possível cancelar porque o agendamento não está mais disponível para cancelamento." : "Não consegui confirmar o cancelamento agora. Não repetirei a operação até concluir a verificação.";
  await db().transaction(async tx => {
    await tx.update(n8nAgentBookingCancellationStates).set({ status, executionErrorCode: error, executionCompletedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingCancellationStates.id, input.state.id), eq(n8nAgentBookingCancellationStates.status, "execution_in_progress")));
    await tx.insert(outbox).values({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", attempts: 0, dedupeKey: "wa_send:cancellation-result:" + input.state.id, payload: { companyId: input.state.companyId, toPhone: normalizePhoneE164(input.toPhone), text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_cancellation_execution_v1", emittedAt: now.toISOString() } }, createdAt: now, updatedAt: now }).onConflictDoNothing();
  });
}

type Input = { stateId: string; companyId: string; whatsappAccountId: string; senderPhoneE164: string; correlationId: string };
type Dependencies = { load: typeof load; claim: typeof claim; cancel: typeof cancel; complete: typeof complete };
export async function executePersistedN8nAgentBookingCancellation(input: Input, dependencies: Dependencies = { load, claim, cancel, complete }) {
  const state = await dependencies.load(input);
  if (!state) return { executed: false as const, reason: "state_not_found" as const };
  return executeConfirmedN8nAgentBookingCancellation(state, { claim: dependencies.claim, cancel: dependencies.cancel, complete: (stateId, result) => dependencies.complete({ state: { ...state, id: stateId }, toPhone: input.senderPhoneE164, correlationId: input.correlationId, result }) });
}
