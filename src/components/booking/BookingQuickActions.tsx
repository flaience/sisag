"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CirclePlay, Loader2, UserCheck, UserX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { actionRequest } from "@/lib/ui/actionRequest";
import { getActionResultMessage } from "@/lib/ui/actionResult";
import { BOOKING_ACTION_LABELS, canCancelBooking, canMarkNoShow, getPrimaryOperationalAction } from "@/modules/bookings/BookingOperational.presentation";
import type { BookingLifecycleAction } from "@/modules/bookings/Booking.state-contract";

type Props = { bookingId: string; status: string };
type Feedback = { type: "success" | "error" | "info"; message: string } | null;
const icons = { confirm: CheckCircle2, arrive: UserCheck, start: CirclePlay, complete: CheckCircle2 } as const;

export function BookingQuickActions({ bookingId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<BookingLifecycleAction | null>(null);
  const [confirmingRisk, setConfirmingRisk] = useState<"cancel" | "no_show" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const primary = getPrimaryOperationalAction(status);

  async function apply(action: BookingLifecycleAction) {
    if ((action === "cancel" || action === "no_show") && confirmingRisk !== action) {
      setConfirmingRisk(action); setFeedback({ type: "info", message: action === "cancel" ? "Clique novamente para confirmar o cancelamento." : "Confirme que o cliente realmente não compareceu." }); return;
    }
    try {
      setLoading(action); setFeedback(null);
      const result = await actionRequest<{ ok: true; bookingId: string; status?: string }>(`/api/v1/bookings/${bookingId}/action`, { method: "POST", body: JSON.stringify({ action }) });
      if (!result.ok) { setFeedback({ type: "error", message: getActionResultMessage(result, "Não foi possível atualizar o atendimento.") }); return; }
      setConfirmingRisk(null);
      setFeedback({ type: "success", message: BOOKING_ACTION_LABELS[action]?.success ?? "Atendimento atualizado." });
      router.refresh();
    } finally { setLoading(null); }
  }

  const PrimaryIcon = primary ? icons[primary as keyof typeof icons] : null;
  const primaryCopy = primary ? BOOKING_ACTION_LABELS[primary] : null;
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-col gap-2">
        {primary && primaryCopy && PrimaryIcon ? (
          <Button type="button" onClick={() => void apply(primary)} disabled={loading !== null} className="w-full justify-center">
            {loading === primary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PrimaryIcon className="mr-2 h-4 w-4" />}
            {loading === primary ? primaryCopy.loading : primaryCopy.label}
          </Button>
        ) : null}
        <div className="flex gap-2">
          {canMarkNoShow(status) ? (
            <Button type="button" variant={confirmingRisk === "no_show" ? "destructive" : "outline"} size="sm" disabled={loading !== null} onClick={() => void apply("no_show")} className="flex-1">
              {loading === "no_show" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
              {confirmingRisk === "no_show" ? "Confirmar ausência" : "Ausência"}
            </Button>
          ) : null}
          {canCancelBooking(status) ? (
            <Button type="button" variant={confirmingRisk === "cancel" ? "destructive" : "outline"} size="sm" disabled={loading !== null} onClick={() => void apply("cancel")} className="flex-1">
              {loading === "cancel" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              {confirmingRisk === "cancel" ? "Confirmar" : "Cancelar"}
            </Button>
          ) : null}
        </div>
      </div>
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
    </div>
  );
}
