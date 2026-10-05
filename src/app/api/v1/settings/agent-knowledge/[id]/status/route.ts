import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/apiAuth";
import { N8nAgentKnowledgeStatusSchema } from "@/modules/agents/n8n/N8nAgentKnowledgeManagement.schema";
import { N8nAgentKnowledgeManagementService } from "@/modules/agents/n8n/N8nAgentKnowledgeManagement.service";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(request, ["owner", "admin"]);
  if (auth.ok === false) return auth.response;
  const id = z.string().uuid().safeParse((await context.params).id);
  const command = N8nAgentKnowledgeStatusSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !command.success) return NextResponse.json({ ok: false, error: "invalid_agent_knowledge_transition" }, { status: 400 });
  const item = await N8nAgentKnowledgeManagementService.transition({ companyId: auth.auth.companyId, documentId: id.data, actorId: auth.auth.userId, action: command.data.action });
  return NextResponse.json(item ? { ok: true, item } : { ok: false, error: "invalid_agent_knowledge_transition" }, { status: item ? 200 : 409 });
}
