"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { actionRequest } from "@/lib/ui/actionRequest";

type BookingQuickActionsProps = {
  bookingId: string;
  status: string;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export function BookingQuickActions({
  bookingId,
  status,
}: BookingQuickActionsProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "confirm" | "cancel" | null
  >(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  async function handleConfirm() {
    try {
      setLoadingAction("confirm");
      setFeedback(null);

      const result = await actionRequest<{
        ok: true;
        bookingId: string;
        startTime: string;
        message: string;
      }>(`/api/v1/bookings/${bookingId}/confirm`, {
        method: "POST",
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.data.message || "Booking confirmado com sucesso.",
      });

      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCancel() {
    try {
      setLoadingAction("cancel");
      setFeedback(null);

      const result = await actionRequest<{
        ok: true;
        bookingId: string;
        startTime: string;
        message: string;
      }>(`/api/v1/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      if (!result.ok) {
        setFeedback({
          type: "error",
          message: result.message,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.data.message || "Booking cancelado com sucesso.",
      });

      router.refresh();
    } finally {
      setLoadingAction(null);
    }
  }

  const isPending = status === "PENDING";
  const isConfirmed = status === "CONFIRMED";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {isPending ? (
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto"
          >
            {loadingAction === "confirm" ? (
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

        {isPending || isConfirmed ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loadingAction !== null}
            className="w-full sm:w-auto"
          >
            {loadingAction === "cancel" ? (
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
      </div>

      {feedback ? (
        <ActionFeedback type={feedback.type} message={feedback.message} />
      ) : null}
    </div>
  );
}
