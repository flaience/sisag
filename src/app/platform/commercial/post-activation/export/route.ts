import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/auth/requirePlatformOperator";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { exportCommercialPostActivationAlertHistoryCsv } from "@/modules/commercial/commercial-post-activation-alert-history-export.service";
import {
  listCommercialPostActivationAlertHistory,
  type ListCommercialPostActivationAlertHistoryInput,
} from "@/modules/commercial/commercial-post-activation-alert-history.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  await requirePlatformOperator(session?.access_token ?? "");

  const url = new URL(request.url);
  const rawAction = url.searchParams.get("action") ?? undefined;
  const rawActorType = url.searchParams.get("actorType") ?? undefined;
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    action: rawAction || undefined,
    actorType: rawActorType || undefined,
    limit: rawLimit === undefined ? 100 : Number(rawLimit),
  } as ListCommercialPostActivationAlertHistoryInput;

  try {
    const result = await listCommercialPostActivationAlertHistory(input);
    if (result.ok === false) {
      return NextResponse.json({
        ok: false,
        error: {
          code: "COMMERCIAL_INVALID_INPUT",
          message: result.message,
        },
      }, { status: 400 });
    }

    const csv = exportCommercialPostActivationAlertHistoryCsv(result.data.items);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="sisag-post-activation-alert-history-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERT HISTORY EXPORT ERROR:", error);
    return NextResponse.json({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível exportar o histórico dos alertas pós-ativação.",
      },
    }, { status: 500 });
  }
}
