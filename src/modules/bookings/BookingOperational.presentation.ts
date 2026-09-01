import type { BookingLifecycleAction, PersistedBookingState } from "./Booking.state-contract";

export const BOOKING_STATUS_PRESENTATION: Record<PersistedBookingState, { label: string; classes: string }> = {
  PENDING: { label: "Pendente", classes: "border-amber-200 bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmado", classes: "border-blue-200 bg-blue-50 text-blue-700" },
  ARRIVED: { label: "Cliente chegou", classes: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  IN_PROGRESS: { label: "Em atendimento", classes: "border-violet-200 bg-violet-50 text-violet-700" },
  CANCELLED: { label: "Cancelado", classes: "border-rose-200 bg-rose-50 text-rose-700" },
  COMPLETED: { label: "Concluído", classes: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  NO_SHOW: { label: "Não compareceu", classes: "border-slate-300 bg-slate-100 text-slate-700" },
  RESCHEDULED: { label: "Reagendado (histórico)", classes: "border-slate-200 bg-slate-50 text-slate-600" },
};

export const BOOKING_ACTION_LABELS: Partial<Record<BookingLifecycleAction, { label: string; loading: string; success: string }>> = {
  confirm: { label: "Confirmar", loading: "Confirmando...", success: "Agendamento confirmado." },
  arrive: { label: "Registrar chegada", loading: "Registrando...", success: "Chegada registrada." },
  start: { label: "Iniciar atendimento", loading: "Iniciando...", success: "Atendimento iniciado." },
  complete: { label: "Concluir atendimento", loading: "Concluindo...", success: "Atendimento concluído." },
  no_show: { label: "Não compareceu", loading: "Registrando...", success: "Ausência registrada." },
  cancel: { label: "Cancelar", loading: "Cancelando...", success: "Agendamento cancelado." },
};

export function getPrimaryOperationalAction(status: string): BookingLifecycleAction | null {
  const map: Record<string, BookingLifecycleAction> = { PENDING: "confirm", CONFIRMED: "arrive", ARRIVED: "start", IN_PROGRESS: "complete" };
  return map[status.toUpperCase()] ?? null;
}
export function canMarkNoShow(status: string) { return ["CONFIRMED", "ARRIVED"].includes(status.toUpperCase()); }
export function canCancelBooking(status: string) { return ["PENDING", "CONFIRMED"].includes(status.toUpperCase()); }
