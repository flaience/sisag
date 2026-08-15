"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePlatformOperator } from "@/lib/auth/requirePlatformOperator";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { recordCommercialPostActivationAlertAction } from "@/modules/commercial/commercial-post-activation-alert-action.service";

const actionInputSchema = z.object({
  requestId: z.string().uuid(),
  onboardingId: z.string().uuid(),
  alertKey: z.string().trim().min(1).max(400),
  action: z.enum(["acknowledged", "resolved"]),
});

export type PerformPostActivationAlertActionInput = {
  requestId: string;
  onboardingId: string;
  alertKey: string;
  action: "acknowledged" | "resolved";
};

export type PerformPostActivationAlertActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function performPostActivationAlertAction(
  rawInput: PerformPostActivationAlertActionInput,
): Promise<PerformPostActivationAlertActionResult> {
  const parsed = actionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, message: "A ação informada é inválida." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const operator = await requirePlatformOperator(session?.access_token ?? "");
  const actedAt = new Date().toISOString();
  const result = await recordCommercialPostActivationAlertAction({
    onboardingId: parsed.data.onboardingId,
    alertAction: {
      idempotencyKey: `platform-alert:${parsed.data.requestId}`,
      alertKey: parsed.data.alertKey,
      action: parsed.data.action,
      actor: { type: "human", id: operator.userId },
      actedAt,
    },
  });

  if (result.ok === false) {
    return {
      ok: false,
      message: "Não foi possível atualizar o alerta. Atualize o painel e tente novamente.",
    };
  }

  revalidatePath("/platform/commercial/post-activation");
  return {
    ok: true,
    message: parsed.data.action === "acknowledged"
      ? "Alerta reconhecido com sucesso."
      : "Alerta resolvido com sucesso.",
  };
}
