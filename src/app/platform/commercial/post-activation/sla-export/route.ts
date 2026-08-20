import { NextResponse } from "next/server";
import { requirePlatformOperator } from "@/lib/auth/requirePlatformOperator";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { exportCommercialPostActivationAlertSlaCsv } from "@/modules/commercial/commercial-post-activation-alert-sla-export.service";
import { listCommercialPostActivationAlertSla, type ListCommercialPostActivationAlertSlaInput } from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  await requirePlatformOperator(session?.access_token ?? "");
  const url = new URL(request.url);
  const rawLimit = url.searchParams.get("limit") ?? undefined;
  const input = {
    severity: url.searchParams.get("severity") || undefined,
    lifecycle: url.searchParams.get("lifecycle") || undefined,
    breach: url.searchParams.get("breach") || undefined,
    limit: rawLimit === undefined ? 1000 : Number(rawLimit),
  } as ListCommercialPostActivationAlertSlaInput;

  try {
    const result = await listCommercialPostActivationAlertSla(input);
    if (result.ok === false) {
      return NextResponse.json({ ok: false, error: { code: "COMMERCIAL_INVALID_INPUT", message: result.message } }, { status: 400 });
    }
    const csv = exportCommercialPostActivationAlertSlaCsv(result.data.items);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, { status: 200, headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="sisag-post-activation-alert-sla-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    } });
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERT SLA EXPORT ERROR:", error);
    return NextResponse.json({ ok: false, error: {
      code: "COMMERCIAL_UNKNOWN_ERROR",
      message: "Não foi possível exportar o SLA dos alertas pós-ativação.",
    } }, { status: 500 });
  }
}
