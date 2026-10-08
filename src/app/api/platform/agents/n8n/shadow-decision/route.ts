import { NextResponse } from "next/server";
import { validateInternalRequest } from "@/platform/core/security";
import { N8nAgentShadowDecisionInputSchema } from "@/modules/agents/n8n/N8nAgentShadowDecision.schema";
import { executeN8nAgentShadowDecision } from "@/modules/agents/n8n/N8nAgentShadowDecision.service";
import { createConfiguredN8nAgentShadowDecisionProvider } from "@/modules/agents/n8n/N8nAgentShadowDecision.factory";
import { retrieveN8nAgentKnowledge } from "@/modules/agents/n8n/N8nAgentKnowledgeRetriever.service";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;
  try {
    const parsed = N8nAgentShadowDecisionInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_shadow_decision_request" }, { status: 400 });
    const configured = await createConfiguredN8nAgentShadowDecisionProvider();
    const result = await executeN8nAgentShadowDecision(parsed.data, { retrieveKnowledge: retrieveN8nAgentKnowledge, ...(configured ?? {}) });
    return NextResponse.json({ ok: true, mode: "shadow", dispatchAllowed: false, toolExecutionAllowed: false, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "shadow_decision_failed" }, { status: 502 });
  }
}
