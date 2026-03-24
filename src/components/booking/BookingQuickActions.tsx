// src/components/bookings/BookingQuickActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type BookingQuickActionsProps = {
  bookingId: string;
  status: string;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
} | null;

function getErrorMessage(response: any, fallback: string) {
  return response?.message ?? response?.error ?? fallback;
}

export function BookingQuickActions({
  bookingId,
  status,
}: BookingQuickActionsProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "confirm" | "cancel" | null
  >(null);
  const [feedback, setFeedback] = useState<ActionFeedback>(null);

  const normalizedStatus = status?.toUpperCase?.() ?? "";

  const canConfirm = normalizedStatus === "PENDING";
  const canCancel =
    normalizedStatus === "PENDING" || normalizedStatus === "CONFIRMED";

  async function runAction(action: "confirm" | "cancel") {
    try {
      setLoadingAction(action);
      setFeedback(null);

      const res = await fetch(`/api/v1/bookings/${bookingId}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        setFeedback({
          type: "error",
          message: getErrorMessage(
            response,
            action === "confirm"
              ? "Não foi possível confirmar o booking."
              : "Não foi possível cancelar o booking.",
          ),
        });
        return;
      }

      setFeedback({
        type: "success",
        message:
          action === "confirm"
            ? "Booking confirmado com sucesso."
            : "Booking cancelado com sucesso.",
      });

      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message:
          action === "confirm"
            ? "Erro ao confirmar booking."
            : "Erro ao cancelar booking.",
      });
    } finally {
      setLoadingAction(null);
    }
  }

  if (!canConfirm && !canCancel) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Nenhuma ação rápida disponível para este status.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {canConfirm && (
          <Button
            type="button"
            size="sm"
            onClick={() => runAction("confirm")}
            disabled={loadingAction !== null}
            className="w-full justify-start"
          >
            {loadingAction === "confirm" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {loadingAction === "confirm"
              ? "Confirmando..."
              : "Confirmar booking"}
          </Button>
        )}

        {canCancel && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => runAction("cancel")}
            disabled={loadingAction !== null}
            className="w-full justify-start"
          >
            {loadingAction === "cancel" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {loadingAction === "cancel" ? "Cancelando..." : "Cancelar booking"}
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
