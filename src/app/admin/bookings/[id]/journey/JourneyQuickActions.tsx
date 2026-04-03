// src/app/admin/bookings/[id]/journey/JourneyQuickActions.tsx
"use client";

import { Loader2, CheckCircle2, XCircle, CalendarDays, History, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  status: string;
  confirming: boolean;
  cancelling: boolean;
  rescheduling: boolean;
  recreating: boolean;
  sendingType: "pre" | "post" | null;
  onConfirm: () => void;
  onCancel: () => void;
  onOpenReschedule: () => void;
  onOpenRecreate: () => void;
  onSendPre: () => void;
  onSendPost: () => void;
};

export function JourneyQuickActions({
  status,
  confirming,
  cancelling,
  rescheduling,
  recreating,
  sendingType,
  onConfirm,
  onCancel,
  onOpenReschedule,
  onOpenRecreate,
  onSendPre,
  onSendPost,
}: Props) {
  const normalized = status.toUpperCase();
  const canConfirm = normalized === "PENDING";
  const canCancel = normalized === "PENDING" || normalized === "CONFIRMED";
  const canReschedule = normalized === "PENDING" || normalized === "CONFIRMED";
  const canRecreate = normalized === "CANCELLED";

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canConfirm ? (
          <Button onClick={onConfirm} disabled={confirming} className="w-full sm:w-auto">
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar
              </>
            )}
          </Button>
        ) : null}

        {canCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={cancelling} className="w-full sm:w-auto">
            {cancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </>
            )}
          </Button>
        ) : null}

        {canReschedule ? (
          <Button variant="outline" onClick={onOpenReschedule} disabled={rescheduling} className="w-full sm:w-auto">
            <CalendarDays className="mr-2 h-4 w-4" />
            Reagendar
          </Button>
        ) : null}

        {canRecreate ? (
          <Button variant="outline" onClick={onOpenRecreate} disabled={recreating} className="w-full sm:w-auto">
            <History className="mr-2 h-4 w-4" />
            Retomar atendimento
          </Button>
        ) : null}

        <Button variant="outline" onClick={onSendPre} disabled={sendingType !== null} className="w-full sm:w-auto">
          {sendingType === "pre" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando pré...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Enviar pré-atendimento
            </>
          )}
        </Button>

        <Button variant="outline" onClick={onSendPost} disabled={sendingType !== null} className="w-full sm:w-auto">
          {sendingType === "post" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando pós...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              Enviar pós-atendimento
            </>
          )}
        </Button>
      </div>
    </section>
  );
}