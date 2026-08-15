"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { performPostActivationAlertAction } from "@/app/platform/commercial/post-activation/actions";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";

type PostActivationAlertActionsProps = {
  onboardingId: string;
  alertKey: string;
  lifecycle: "new" | "acknowledged";
};

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export function PostActivationAlertActions({
  onboardingId,
  alertKey,
  lifecycle,
}: PostActivationAlertActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const action = lifecycle === "new" ? "acknowledged" : "resolved";
  const label = action === "acknowledged" ? "Reconhecer" : "Resolver";

  function submit() {
    const requestId = crypto.randomUUID();
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await performPostActivationAlertAction({
          requestId,
          onboardingId,
          alertKey,
          action,
        });
        setFeedback({
          type: result.ok ? "success" : "error",
          message: result.message,
        });
        if (result.ok) router.refresh();
      } catch {
        setFeedback({
          type: "error",
          message: "Não foi possível atualizar o alerta. Tente novamente.",
        });
      }
    });
  }

  return (
    <div className="mt-4 space-y-2">
      <Button
        type="button"
        size="sm"
        variant={action === "acknowledged" ? "outline" : "default"}
        onClick={submit}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
        {isPending ? "Salvando..." : label}
      </Button>
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
    </div>
  );
}
