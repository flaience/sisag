import { NextResponse } from "next/server";
import { validateInternalRequest } from "@/platform/core/security";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { executeN8nAgentReadOnlyGateway } from "@/modules/agents/n8n/N8nAgentReadOnlyGateway.service";
import { retrieveN8nAgentKnowledge } from "@/modules/agents/n8n/N8nAgentKnowledgeRetriever.service";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;
  try {
    const body: unknown = await request.json();
    const adapter = new SisagSchedulingAdapter();
    const result = await executeN8nAgentReadOnlyGateway(body, {
      retrieveKnowledge: retrieveN8nAgentKnowledge,
      execute: async ({ toolCall, companyId, correlationId }) => {
        const context = createOperationalUseCaseContext({ companyId, actor: { type: "agent", id: "n8n-agent" }, correlationId });
        if (toolCall.name === "scheduling.find_available_slots") {
          const args = toolCall.arguments;
          return adapter.findAvailableSlots(context, {
            dateFrom: args.dateFrom,
            dateTo: args.dateTo,
            professionalId: args.professionalId,
            unitId: args.unitId,
            serviceId: args.serviceId,
            resourceId: args.resourceId,
            durationMinutes: args.durationMinutes,
            limit: args.limit,
            stepMinutes: args.stepMinutes,
          });
        }
        return adapter.getAppointmentJourney(context, { appointmentId: toolCall.arguments.appointmentId });
      },
    });
    const status = result.ok ? 200 : result.error === "read_only_tool_failed" || result.error === "knowledge_retrieval_failed" ? 502 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
}
