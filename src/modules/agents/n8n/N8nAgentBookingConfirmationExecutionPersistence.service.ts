import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { clients, n8nAgentBookingConfirmationStates, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { formatPtBr } from "@/lib/time";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { executeBookingCommand } from "@/modules/bookings/BookingCommand.service";
import { executeConfirmedN8nAgentBooking, type ConfirmedBookingState } from "./N8nAgentBookingConfirmationExecution";

type BookingResult = Awaited<ReturnType<typeof executeBookingCommand>>;
const db = () => getDb();

async function load(input: { stateId: string; companyId: string; senderPhoneE164: string }): Promise<ConfirmedBookingState | null> {
  const [state] = await db().select().from(n8nAgentBookingConfirmationStates).where(and(eq(n8nAgentBookingConfirmationStates.id, input.stateId), eq(n8nAgentBookingConfirmationStates.companyId, input.companyId))).limit(1);
  if (!state || state.status !== "confirmed_pending_execution") return null;
  const phone = normalizePhoneE164(input.senderPhoneE164);
  const [client] = await db().select({ id: clients.id }).from(clients).where(and(eq(clients.companyId, input.companyId), eq(clients.phoneE164, phone))).limit(1);
  if (!client) return null;
  return { id: state.id, companyId: state.companyId, clientId: client.id, serviceId: state.serviceId, professionalId: state.professionalId, unitId: state.unitId, startsAt: state.startsAt, status: "confirmed_pending_execution" };
}

async function claim(stateId: string) {
  const now = new Date();
  const rows = await db().update(n8nAgentBookingConfirmationStates).set({ status: "execution_in_progress", executionStartedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingConfirmationStates.id, stateId), eq(n8nAgentBookingConfirmationStates.status, "confirmed_pending_execution"))).returning({ id: n8nAgentBookingConfirmationStates.id });
  return Boolean(rows[0]);
}

async function complete(input: { state: ConfirmedBookingState; toPhone: string; correlationId: string; result: BookingResult }) {
  const now = new Date();
  let error: string | null;
  let status: "completed" | "failed_slot_taken" | "execution_uncertain";
  let bookingId: string | null;
  let text: string;
  if ("error" in input.result) {
    error = input.result.error;
    status = error === "slot_taken" ? "failed_slot_taken" : "execution_uncertain";
    bookingId = null;
    text = error === "slot_taken" ? "Esse horário acabou de ficar indisponível. Quer escolher outro?" : "Não consegui confirmar o resultado agora. Não criarei outra reserva até concluir a verificação.";
  } else {
    error = null;
    status = "completed";
    bookingId = input.result.booking.id;
    text = "Agendado ✅\n📅 " + formatPtBr(input.result.booking.startTime) + "\nProtocolo: " + input.result.booking.id;
  }
  await db().transaction(async tx => {
    await tx.update(n8nAgentBookingConfirmationStates).set({ status, bookingId, executionErrorCode: error, executionCompletedAt: now, updatedAt: now }).where(and(eq(n8nAgentBookingConfirmationStates.id, input.state.id), eq(n8nAgentBookingConfirmationStates.status, "execution_in_progress")));
    await tx.insert(outbox).values({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", attempts: 0, dedupeKey: "wa_send:booking-result:" + input.state.id, payload: { companyId: input.state.companyId, toPhone: normalizePhoneE164(input.toPhone), text, clientId: input.state.clientId, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_execution_v1", emittedAt: now.toISOString() } }, createdAt: now, updatedAt: now }).onConflictDoNothing();
  });
}

type Dependencies = { load: typeof load; claim: typeof claim; execute: typeof executeBookingCommand; complete: typeof complete };
export async function executePersistedN8nAgentBookingConfirmation(input: { stateId: string; companyId: string; senderPhoneE164: string; correlationId: string }, dependencies: Dependencies = { load, claim, execute: executeBookingCommand, complete }) {
  const state = await dependencies.load(input);
  if (!state) return { executed: false as const, reason: "state_or_client_not_found" as const };
  return executeConfirmedN8nAgentBooking(state, { claim: dependencies.claim, execute: dependencies.execute, complete: (stateId, result) => dependencies.complete({ state: { ...state, id: stateId }, toPhone: input.senderPhoneE164, correlationId: input.correlationId, result }) });
}
