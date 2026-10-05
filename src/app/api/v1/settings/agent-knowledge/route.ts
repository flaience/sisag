import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { N8nAgentKnowledgeCreateSchema } from "@/modules/agents/n8n/N8nAgentKnowledgeManagement.schema";
import { N8nAgentKnowledgeManagementService } from "@/modules/agents/n8n/N8nAgentKnowledgeManagement.service";
export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  return NextResponse.json({ ok: true, items: await N8nAgentKnowledgeManagementService.list(auth.auth.companyId) });
}
export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  const parsed = N8nAgentKnowledgeCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_agent_knowledge", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const item = await N8nAgentKnowledgeManagementService.create({ companyId: auth.auth.companyId, actorId: auth.auth.userId, data: parsed.data });
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
