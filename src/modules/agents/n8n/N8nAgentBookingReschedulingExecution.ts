import type { AppointmentSummary, SchedulingOperationResult } from "@/platform/capabilities/scheduling/operations";

export type ConfirmedBookingReschedulingState = {
  id: string;
  companyId: string;
  appointmentId: string;
  currentStartsAt: Date;
  newStartsAt: Date;
  newEndsAt: Date;
  status: "rescheduling_pending" | "execution_in_progress";
};

type ReschedulingResult = SchedulingOperationResult<AppointmentSummary>;
type Dependencies = {
  claim: (stateId: string) => Promise<boolean>;
  reschedule: (input: { companyId: string; appointmentId: string; startsAt: string; endsAt: string; correlationId: string; reason: string }) => Promise<ReschedulingResult>;
  complete: (stateId: string, result: ReschedulingResult) => Promise<void>;
};

export function bookingReschedulingRequestId(stateId: string) {
  return "n8n-rescheduling:" + stateId;
}

export async function executeConfirmedN8nAgentBookingRescheduling(state: ConfirmedBookingReschedulingState, dependencies: Dependencies) {
  if (state.status !== "rescheduling_pending" && state.status !== "execution_in_progress") return { executed: false as const, reason: "invalid_state" as const };
  const now = new Date();
  if (state.currentStartsAt <= now || state.newStartsAt <= now || state.newEndsAt <= state.newStartsAt || state.currentStartsAt.getTime() === state.newStartsAt.getTime()) return { executed: false as const, reason: "invalid_schedule" as const };
  if (state.status === "rescheduling_pending" && !(await dependencies.claim(state.id))) return { executed: false as const, reason: "already_claimed" as const };
  const result = await dependencies.reschedule({ companyId: state.companyId, appointmentId: state.appointmentId, startsAt: state.newStartsAt.toISOString(), endsAt: state.newEndsAt.toISOString(), correlationId: bookingReschedulingRequestId(state.id), reason: "Remarcação confirmada pelo cliente via WhatsApp" });
  await dependencies.complete(state.id, result);
  return { executed: true as const, result };
}
