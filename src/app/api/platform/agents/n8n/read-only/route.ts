import { NextResponse } from "next/server";
import { validateInternalRequest } from "@/platform/core/security";
import { createOperationalUseCaseContext } from "@/platform/core/use-cases";
import { SisagSchedulingAdapter } from "@/platform/capabilities/scheduling";
import { executeN8nAgentReadOnlyGateway } from "@/modules/agents/n8n/N8nAgentReadOnlyGateway.service";
import { retrieveN8nAgentKnowledge } from "@/modules/agents/n8n/N8nAgentKnowledgeRetriever.service";
import { N8nAgentReadOnlyGatewaySchema } from "@/modules/agents/n8n/N8nAgentReadOnlyGateway.schema";
import { createN8nAgentGatewayObservation } from "@/modules/agents/n8n/N8nAgentGatewayObservation";
import { resolveN8nAgentAppointmentStatusTarget } from "@/modules/agents/n8n/N8nAgentAppointmentStatusResolver.service";
import { loadN8nAgentBookingMinLeadMinutes, resolveN8nAgentAvailabilityStart } from "@/modules/agents/n8n/N8nAgentAvailabilityStart";

export async function POST(request: Request) {
  const auth = validateInternalRequest(request);
  if (auth.ok === false) return auth.response;
  try {
    const body: unknown = await request.json();
    const parsedBody = N8nAgentReadOnlyGatewaySchema.safeParse(body);
    const adapter = new SisagSchedulingAdapter();
    const result = await executeN8nAgentReadOnlyGateway(body, {
      retrieveKnowledge: retrieveN8nAgentKnowledge,
      execute: async ({ toolCall, companyId, correlationId }) => {
        const context = createOperationalUseCaseContext({ companyId, actor: { type: "agent", id: "n8n-agent" }, correlationId });
        if (toolCall.name === "scheduling.find_available_slots") {
          const args = toolCall.arguments;
          const stepMinutes = args.stepMinutes ?? 15;
          const minLeadMinutes = await loadN8nAgentBookingMinLeadMinutes(companyId);
          const dateFrom = resolveN8nAgentAvailabilityStart({ requestedFrom: args.dateFrom, now: new Date(), minLeadMinutes, stepMinutes });
          return adapter.findAvailableSlots(context, {
            dateFrom,
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
        const target = await resolveN8nAgentAppointmentStatusTarget({ companyId, senderPhoneE164: parsedBody.success ? parsedBody.data.request.trustedContext.senderPhoneE164 : "", appointmentId: toolCall.arguments.appointmentId });
        if (!target.ok) return { ok: false, error: { code: "SCHEDULING_APPOINTMENT_NOT_FOUND", message: "Nenhum agendamento do cliente foi encontrado." } };
        return adapter.getAppointmentJourney(context, { appointmentId: target.appointmentId });
      },
    });
    if (parsedBody.success) console.info(JSON.stringify(createN8nAgentGatewayObservation(parsedBody.data, result)));
    const status = result.ok ? 200 : result.error === "read_only_tool_failed" || result.error === "knowledge_retrieval_failed" ? 502 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
}
