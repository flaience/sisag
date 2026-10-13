import { executeBookingCommand } from "@/modules/bookings/BookingCommand.service";
import { isoUtcToDateIsoInTz, isoUtcToHHMMInTz } from "@/lib/time";

export type ConfirmedBookingState = {
  id: string;
  companyId: string;
  clientId: string;
  serviceId: string;
  professionalId: string | null;
  unitId: string | null;
  startsAt: Date;
  status: "confirmed_pending_execution";
};

type BookingResult = Awaited<ReturnType<typeof executeBookingCommand>>;
type Dependencies = {
  claim: (stateId: string) => Promise<boolean>;
  execute: typeof executeBookingCommand;
  complete: (stateId: string, result: BookingResult) => Promise<void>;
};

export function bookingConfirmationRequestId(stateId: string) {
  return "n8n-confirmation:" + stateId;
}

export async function executeConfirmedN8nAgentBooking(
  state: ConfirmedBookingState,
  dependencies: Dependencies,
) {
  if (state.status !== "confirmed_pending_execution") return { executed: false as const, reason: "invalid_state" as const };
  if (!(await dependencies.claim(state.id))) return { executed: false as const, reason: "already_claimed" as const };
  const startTime = state.startsAt.toISOString();
  const result = await dependencies.execute(
    { companyId: state.companyId, userId: null },
    {
      clientId: state.clientId,
      unitId: state.unitId,
      professionalId: state.professionalId,
      serviceId: state.serviceId,
      date: isoUtcToDateIsoInTz(startTime),
      time: isoUtcToHHMMInTz(startTime),
      source: "whatsapp",
      requestId: bookingConfirmationRequestId(state.id),
    },
  );
  await dependencies.complete(state.id, result);
  return { executed: true as const, result };
}
