import type { SchedulingOperationResult, AppointmentSummary } from "@/platform/capabilities/scheduling/operations";

export type ConfirmedBookingCancellationState = {
  id: string;
  companyId: string;
  appointmentId: string;
  startsAt: Date;
  status: "cancellation_pending" | "execution_in_progress";
};

type CancellationResult = SchedulingOperationResult<AppointmentSummary>;
type Dependencies = {
  claim: (stateId: string) => Promise<boolean>;
  cancel: (input: { companyId: string; appointmentId: string; correlationId: string; reason: string }) => Promise<CancellationResult>;
  complete: (stateId: string, result: CancellationResult) => Promise<void>;
};

export function bookingCancellationRequestId(stateId: string) {
  return "n8n-cancellation:" + stateId;
}

export async function executeConfirmedN8nAgentBookingCancellation(state: ConfirmedBookingCancellationState, dependencies: Dependencies) {
  if (state.status !== "cancellation_pending" && state.status !== "execution_in_progress") return { executed: false as const, reason: "invalid_state" as const };
  if (state.startsAt <= new Date()) return { executed: false as const, reason: "appointment_expired" as const };
  if (state.status === "cancellation_pending" && !(await dependencies.claim(state.id))) return { executed: false as const, reason: "already_claimed" as const };
  const result = await dependencies.cancel({ companyId: state.companyId, appointmentId: state.appointmentId, correlationId: bookingCancellationRequestId(state.id), reason: "Cancelamento confirmado pelo cliente via WhatsApp" });
  await dependencies.complete(state.id, result);
  return { executed: true as const, result };
}
