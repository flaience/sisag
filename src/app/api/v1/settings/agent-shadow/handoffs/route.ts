import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { N8nAgentHumanHandoffActionSchema } from "@/modules/agents/n8n/N8nAgentHumanHandoffManagement.schema";
import { N8nAgentHumanHandoffManagementService } from "@/modules/agents/n8n/N8nAgentHumanHandoffManagement.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
  if (auth.ok === false) return auth.response;
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  const rows = await N8nAgentHumanHandoffManagementService.list({ companyId: auth.auth.companyId, status: request.nextUrl.searchParams.get("status"), limit: Number.isFinite(requestedLimit) ? requestedLimit : 30 });
  const items = rows.map(({ claimedBy, resolvedBy, ...item }) => ({ ...item, claimedByCurrentUser: claimedBy === auth.auth.userId, resolvedByCurrentUser: resolvedBy === auth.auth.userId }));
  return NextResponse.json({ ok: true, items }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin", "staff"]);
  if (auth.ok === false) return auth.response;
  const parsed = N8nAgentHumanHandoffActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_handoff_action" }, { status: 400 });
  const result = await N8nAgentHumanHandoffManagementService.apply({ companyId: auth.auth.companyId, actorId: auth.auth.userId, command: parsed.data });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}