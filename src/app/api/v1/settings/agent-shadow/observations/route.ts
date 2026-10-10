import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { N8nAgentShadowMirrorObservationService } from "@/modules/agents/n8n/N8nAgentShadowMirrorObservation.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  const correlationId = request.nextUrl.searchParams.get("correlationId");
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
  const items = await N8nAgentShadowMirrorObservationService.list({
    companyId: auth.auth.companyId,
    correlationId,
    limit: Number.isFinite(requestedLimit) ? requestedLimit : 20,
  });
  return NextResponse.json({ ok: true, items });
}
