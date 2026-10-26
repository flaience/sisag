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
import { prepareN8nAgentBookingReschedulingReadModel } from "@/modules/agents/n8n/N8nAgentBookingReschedulingReadModel.service";
import { listN8nAgentUpcomingAppointments } from "@/modules/agents/n8n/N8nAgentUpcomingAppointments.service";
import { resolveN8nAgentAppointmentSelectionReadModel } from "@/modules/agents/n8n/N8nAgentAppointmentSelectionReadModel.service";

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
        if (toolCall.name === "scheduling.prepare_rescheduling") {
          const senderPhoneE164 = parsedBody.success ? parsedBody.data.request.trustedContext.senderPhoneE164 : "";
          return prepareN8nAgentBookingReschedulingReadModel({ companyId, senderPhoneE164, correlationId, dateFrom: toolCall.arguments.dateFrom, dateTo: toolCall.arguments.dateTo, limit: toolCall.arguments.limit }, {
            resolveAppointment: async ({ companyId: trustedCompanyId, senderPhoneE164: trustedSender, now }) => {
              const target = await resolveN8nAgentAppointmentStatusTarget({ companyId: trustedCompanyId, senderPhoneE164: trustedSender, now });
              if (!target.ok) return { ok: false, error: "appointment_not_found" };
              const journeyResult = await adapter.getAppointmentJourney(context, { appointmentId: target.appointmentId });
              if (!journeyResult.ok || !journeyResult.data || typeof journeyResult.data !== "object") return { ok: false, error: "appointment_not_found" };
              const journey = journeyResult.data as { booking?: { id?: unknown; status?: unknown; startTime?: unknown }; items?: unknown };
              const items = Array.isArray(journey.items) ? journey.items : [];
              const item = items.length === 1 && items[0] && typeof items[0] === "object" ? items[0] as { serviceId?: unknown; serviceName?: unknown } : null;
              const booking = journey.booking;
              if (!booking || typeof booking.id !== "string" || typeof booking.status !== "string" || !(booking.startTime instanceof Date || typeof booking.startTime === "string") || !item || typeof item.serviceId !== "string") return { ok: false, error: "appointment_not_reschedulable" };
              const status = booking.status.toUpperCase();
              if (status !== "PENDING" && status !== "CONFIRMED") return { ok: false, error: "appointment_not_reschedulable" };
              return { ok: true, appointment: { appointmentId: booking.id, status, startsAt: new Date(booking.startTime).toISOString(), serviceId: item.serviceId, serviceName: typeof item.serviceName === "string" ? item.serviceName : null } };
            },
            findAvailableSlots: async ({ serviceId, dateFrom, dateTo, limit }) => {
              const minLeadMinutes = await loadN8nAgentBookingMinLeadMinutes(companyId);
              const effectiveFrom = resolveN8nAgentAvailabilityStart({ requestedFrom: dateFrom, now: new Date(), minLeadMinutes, stepMinutes: 15 });
              const result = await adapter.findAvailableSlots(context, { serviceId, dateFrom: effectiveFrom, dateTo, limit, stepMinutes: 15 });
              if (!result.ok) return { ok: false, error: "availability_failed" };
              return { ok: true, slots: result.data.map(slot => ({ startsAt: slot.startsAt, endsAt: slot.endsAt, serviceId, professionalId: slot.professionalId ?? null, unitId: null })) };
            },
          });
        }
        if (toolCall.name === "scheduling.list_upcoming_appointments") {
          return listN8nAgentUpcomingAppointments({ companyId, senderPhoneE164: parsedBody.success ? parsedBody.data.request.trustedContext.senderPhoneE164 : "", limit: toolCall.arguments.limit });
        }
        if (toolCall.name === "scheduling.select_appointment") {
          const trusted = parsedBody.success ? parsedBody.data.request : null;
          if (!trusted) return { ok: false, error: "invalid_trusted_request" };
          return resolveN8nAgentAppointmentSelectionReadModel({
            companyId,
            senderPhoneE164: trusted.trustedContext.senderPhoneE164,
            text: trusted.message.text,
            timeZone: trusted.trustedContext.timeZone,
            now: new Date(trusted.trustedContext.receivedAt),
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
